-- =====================================================================
-- 0002_functions.sql
-- Parte 1 (Task 7): helpers SQL + RPCs públicas
-- Parte 2 (Task 8): RPCs de admin
-- Parte 3 (Task 9): coluna webhook_secret_hash + assert_webhook + RPC de pagamento
-- =====================================================================


-- =====================================================================
-- PARTE 1 (Task 7) — HELPERS + RPCs PÚBLICAS
-- =====================================================================

-- ========== HELPERS ==========
create or replace function assert_admin(p_secret text)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare ok boolean;
begin
  select (secret_hash <> '' and secret_hash = crypt(p_secret, secret_hash)) into ok from admin_config where id = 1;
  if not coalesce(ok, false) then
    raise exception 'não autorizado' using errcode = '28000';
  end if;
end $$;

create or replace function _slugify(txt text)
returns text language sql immutable as $$
  select trim(both '-' from regexp_replace(
    translate(lower(txt),
      'áàâãäéèêëíìîïóòôõöúùûüçñ',
      'aaaaaeeeeiiiiooooouuuucn'),
    '[^a-z0-9]+', '-', 'g'));
$$;

-- ========== PREÇO (fonte da verdade no checkout) ==========
create or replace function _preco_varejo(p_preco numeric, p_desc int)
returns numeric language sql immutable as $$
  select case when coalesce(p_desc,0) = 0 then p_preco
         else round(p_preco * (1 - p_desc/100.0), 2) end;
$$;

create or replace function _preco_atacado(p_preco numeric, p_override numeric, p_pct int)
returns numeric language sql immutable as $$
  select case
    when p_override is not null then p_override
    when p_pct is not null then round(p_preco * (1 - p_pct/100.0), 2)
    else p_preco end;
$$;

-- ========== CHECKOUT ==========
create or replace function checkout_iniciar_pedido(
  p_cliente_nome text,
  p_cliente_telefone text,
  p_entrega_tipo entrega_tipo,
  p_endereco_rua text,
  p_endereco_numero text,
  p_endereco_bairro text,
  p_endereco_complemento text,
  p_endereco_cep text,
  p_endereco_cidade text,
  p_items jsonb,               -- [{produto_id,color_id,size_id,quantidade}]
  p_is_atacado boolean default false,
  p_customer_id uuid default null,
  p_revendedor_id uuid default null
) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_order_id uuid;
  v_item jsonb;
  v_prod products;
  v_size product_sizes;
  v_color product_colors;
  v_preco numeric;
  v_qtd int;
  v_qtd_total int;
  v_prod_total numeric := 0;
  v_taxa numeric := 0;
  v_mp_itens jsonb := '[]'::jsonb;
begin
  if jsonb_array_length(coalesce(p_items,'[]'::jsonb)) = 0 then
    raise exception 'carrinho vazio';
  end if;

  -- Atacado: exige revendedor aprovado (a tabela revendedores só existe na Fase 3;
  -- nesta fase p_is_atacado é sempre false, então o ramo não executa).
  if p_is_atacado then
    raise exception 'atacado indisponível nesta fase';
  end if;

  -- taxa de entrega
  if p_entrega_tipo = 'entrega' then
    select taxa_entrega_local into v_taxa from admin_config where id = 1;
  end if;

  insert into orders(status, cliente_nome, cliente_telefone, entrega_tipo, entrega_taxa,
    endereco_rua, endereco_numero, endereco_bairro, endereco_complemento, endereco_cep, endereco_cidade,
    is_atacado, customer_id, revendedor_id, valor_produtos, valor_total)
  values ('pendente', p_cliente_nome, regexp_replace(p_cliente_telefone,'\D','','g'),
    p_entrega_tipo, coalesce(v_taxa,0),
    p_endereco_rua, p_endereco_numero, p_endereco_bairro, p_endereco_complemento, p_endereco_cep,
    case when p_entrega_tipo = 'entrega_fora' then p_endereco_cidade else null end,
    false, p_customer_id, p_revendedor_id, 0, 0)
  returning id into v_order_id;

  -- Ordena por size_id (nulls last) => travas `for update` sempre na mesma ordem (deadlock-safe).
  for v_item in
    select t.value
    from jsonb_array_elements(p_items) as t(value)
    order by nullif(t.value->>'size_id','')::uuid nulls last
  loop
    v_qtd := (v_item->>'quantidade')::int;
    if v_qtd is null or v_qtd < 1 then raise exception 'quantidade inválida'; end if;

    select * into v_prod  from products       where id = (v_item->>'produto_id')::uuid and ativo;
    if not found then raise exception 'produto indisponível'; end if;
    select * into v_color from product_colors where id = (v_item->>'color_id')::uuid and product_id = v_prod.id;
    if not found then raise exception 'cor indisponível'; end if;

    if nullif(v_item->>'size_id','') is not null then
      select * into v_size from product_sizes where id = (v_item->>'size_id')::uuid and color_id = v_color.id
        for update;
      if not found then raise exception 'tamanho indisponível'; end if;
      -- Soma a quantidade pedida para este size_id em todo o carrinho (evita oversell do mesmo SKU repetido).
      select coalesce(sum((it->>'quantidade')::int), 0) into v_qtd_total
      from jsonb_array_elements(p_items) as it
      where nullif(it->>'size_id','')::uuid = nullif(v_item->>'size_id','')::uuid;
      if v_size.estoque < v_qtd_total then raise exception 'estoque insuficiente'; end if;
    end if;

    v_preco := _preco_varejo(v_prod.preco, v_prod.desconto_percentual);
    v_prod_total := v_prod_total + v_preco * v_qtd;

    insert into order_items(order_id, produto_id, produto_nome, produto_cor, produto_tamanho,
      color_id, size_id, quantidade, preco_unit, subtotal)
    values (v_order_id, v_prod.id, v_prod.nome, v_color.nome,
      case when nullif(v_item->>'size_id','') is not null then v_size.tamanho else null end,
      v_color.id, nullif(v_item->>'size_id','')::uuid, v_qtd, v_preco, v_preco * v_qtd);

    -- Linhas precificadas server-side para montar a preferência Mercado Pago.
    -- É esta a fonte da verdade do valor cobrado — nunca o preço vindo do cliente.
    v_mp_itens := v_mp_itens || jsonb_build_object(
      'titulo', concat_ws(' - ', v_prod.nome, v_color.nome,
         case when nullif(v_item->>'size_id','') is not null then v_size.tamanho end),
      'quantidade', v_qtd,
      'preco_unit', v_preco);
  end loop;

  update orders set valor_produtos = v_prod_total,
                    valor_total = v_prod_total + coalesce(v_taxa,0)
  where id = v_order_id;

  return jsonb_build_object('id', v_order_id, 'entrega_taxa', coalesce(v_taxa, 0),
    'itens', coalesce(v_mp_itens, '[]'::jsonb));
end $$;

-- ========== LEITURA PÚBLICA DE PEDIDO ==========
create or replace function _order_json(p_id uuid)
returns jsonb language sql set search_path = public stable as $$
  select jsonb_build_object(
    'id', o.id, 'created_at', o.created_at, 'status', o.status,
    'cliente_nome', o.cliente_nome, 'entrega_tipo', o.entrega_tipo,
    'entrega_taxa', o.entrega_taxa,
    'endereco_rua', o.endereco_rua, 'endereco_numero', o.endereco_numero,
    'endereco_bairro', o.endereco_bairro, 'endereco_complemento', o.endereco_complemento,
    'endereco_cep', o.endereco_cep, 'endereco_cidade', o.endereco_cidade,
    'valor_produtos', o.valor_produtos, 'valor_total', o.valor_total,
    'is_atacado', o.is_atacado,
    'items', coalesce((select jsonb_agg(jsonb_build_object(
        'id', i.id, 'produto_nome', i.produto_nome, 'produto_cor', i.produto_cor,
        'produto_tamanho', i.produto_tamanho, 'quantidade', i.quantidade,
        'preco_unit', i.preco_unit, 'subtotal', i.subtotal) order by i.produto_nome)
      from order_items i where i.order_id = o.id), '[]'::jsonb))
  from orders o where o.id = p_id;
$$;

create or replace function public_get_order(p_id uuid)
returns jsonb language sql security definer set search_path = public, extensions stable as $$
  select _order_json(p_id);
$$;

create or replace function public_lookup_orders(p_telefone text)
returns jsonb language sql security definer set search_path = public, extensions stable as $$
  select coalesce(jsonb_agg(_order_json(o.id) order by o.created_at desc), '[]'::jsonb)
  from orders o
  where o.cliente_telefone = regexp_replace(p_telefone, '\D', '', 'g')
    and regexp_replace(p_telefone, '\D', '', 'g') <> '';
$$;

-- ========== SURPRESA ==========
create or replace function _product_json(p products)
returns jsonb language sql set search_path = public stable as $$
  select jsonb_build_object(
    'id', p.id, 'slug', p.slug, 'nome', p.nome, 'categoria_id', p.categoria_id,
    'colecao', p.colecao, 'preco', p.preco, 'desconto_percentual', p.desconto_percentual,
    'preco_atacado', p.preco_atacado, 'descricao', p.descricao,
    'caracteristicas', to_jsonb(p.caracteristicas), 'ativo', p.ativo,
    'destaque', p.destaque, 'ordem', p.ordem, 'surpresa_ativo', p.surpresa_ativo,
    'categoria', (select to_jsonb(c) from categorias c where c.id = p.categoria_id),
    'colors', coalesce((select jsonb_agg(jsonb_build_object(
        'id', col.id, 'product_id', col.product_id, 'nome', col.nome, 'hex', col.hex,
        'imagens', to_jsonb(col.imagens), 'ordem', col.ordem,
        'sizes', coalesce((select jsonb_agg(jsonb_build_object(
            'id', s.id, 'color_id', s.color_id, 'tamanho', s.tamanho, 'estoque', s.estoque)
            order by s.tamanho) from product_sizes s where s.color_id = col.id), '[]'::jsonb))
      order by col.ordem) from product_colors col where col.product_id = p.id), '[]'::jsonb));
$$;

create or replace function public_get_surpresa()
returns jsonb language sql security definer set search_path = public, extensions stable as $$
  select _product_json(p) from products p where p.surpresa_ativo and p.ativo limit 1;
$$;


-- =====================================================================
-- PARTE 2 (Task 8) — RPCs DE ADMIN
-- Padrão: language plpgsql security definer set search_path = public, extensions;
-- primeiro statement `perform assert_admin(p_secret)`. Leitura => `stable`.
-- =====================================================================

create or replace function admin_set_secret(p_old_secret text, p_new_secret text)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  perform assert_admin(p_old_secret);
  if length(coalesce(p_new_secret,'')) < 12 then raise exception 'senha precisa de ao menos 12 caracteres'; end if;
  update admin_config set secret_hash = crypt(p_new_secret, gen_salt('bf', 10)) where id = 1;
end $$;

create or replace function admin_list_products(p_secret text)
returns jsonb language plpgsql security definer set search_path = public, extensions stable as $$
begin
  perform assert_admin(p_secret);
  return coalesce((select jsonb_agg(_product_json(p) order by p.ordem, p.nome) from products p), '[]'::jsonb);
end $$;

create or replace function admin_upsert_product(
  p_secret text, p_id uuid, p_nome text, p_categoria_id uuid, p_colecao text,
  p_preco numeric, p_desconto_percentual int, p_preco_atacado numeric, p_descricao text,
  p_caracteristicas text[], p_ativo boolean, p_destaque boolean, p_ordem int, p_slug text
) returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid; v_slug text;
begin
  perform assert_admin(p_secret);
  v_slug := coalesce(nullif(trim(p_slug),''), _slugify(p_nome));
  if p_id is null then
    insert into products(nome,categoria_id,colecao,preco,desconto_percentual,preco_atacado,
      descricao,caracteristicas,ativo,destaque,ordem,slug)
    values (p_nome,p_categoria_id,p_colecao,p_preco,nullif(p_desconto_percentual,0),p_preco_atacado,
      p_descricao,coalesce(p_caracteristicas,'{}'),p_ativo,p_destaque,coalesce(p_ordem,0),v_slug)
    returning id into v_id;
  else
    update products set nome=p_nome, categoria_id=p_categoria_id, colecao=p_colecao, preco=p_preco,
      desconto_percentual=nullif(p_desconto_percentual,0), preco_atacado=p_preco_atacado,
      descricao=p_descricao, caracteristicas=coalesce(p_caracteristicas,'{}'), ativo=p_ativo,
      destaque=p_destaque, ordem=coalesce(p_ordem,0), slug=v_slug
    where id=p_id returning id into v_id;
    if v_id is null then raise exception 'registro não encontrado'; end if;
  end if;
  return v_id;
end $$;

create or replace function admin_delete_product(p_secret text, p_id uuid)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  perform assert_admin(p_secret);
  delete from products where id = p_id;
end $$;

create or replace function admin_set_ativo(p_secret text, p_id uuid, p_ativo boolean)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  perform assert_admin(p_secret);
  update products set ativo = p_ativo where id = p_id;
end $$;

create or replace function admin_set_desconto(p_secret text, p_id uuid, p_desconto_percentual int)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  perform assert_admin(p_secret);
  update products set desconto_percentual = nullif(p_desconto_percentual,0) where id = p_id;
end $$;

create or replace function admin_set_surpresa(p_secret text, p_id uuid, p_ativo boolean)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  perform assert_admin(p_secret);
  if p_id is null then raise exception 'id obrigatório'; end if;
  if p_ativo then update products set surpresa_ativo = (id = p_id);
  else update products set surpresa_ativo = false where id = p_id; end if;
end $$;

create or replace function admin_upsert_color(
  p_secret text, p_id uuid, p_product_id uuid, p_nome text, p_hex text,
  p_imagens text[], p_ordem int
) returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid;
begin
  perform assert_admin(p_secret);
  if p_id is null then
    insert into product_colors(product_id, nome, hex, imagens, ordem)
    values (p_product_id, p_nome, p_hex, coalesce(p_imagens,'{}'), coalesce(p_ordem,0))
    returning id into v_id;
  else
    update product_colors set product_id=p_product_id, nome=p_nome, hex=p_hex,
      imagens=coalesce(p_imagens,'{}'), ordem=coalesce(p_ordem,0)
    where id=p_id returning id into v_id;
    if v_id is null then raise exception 'registro não encontrado'; end if;
  end if;
  return v_id;
end $$;

create or replace function admin_delete_color(p_secret text, p_id uuid)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  perform assert_admin(p_secret);
  delete from product_colors where id = p_id;
end $$;

create or replace function admin_upsert_size(
  p_secret text, p_id uuid, p_color_id uuid, p_tamanho text, p_estoque int
) returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid;
begin
  perform assert_admin(p_secret);
  if p_estoque is null or p_estoque < 0 then raise exception 'estoque inválido'; end if;
  if p_id is null then
    insert into product_sizes(color_id, tamanho, estoque)
    values (p_color_id, p_tamanho, p_estoque)
    returning id into v_id;
  else
    update product_sizes set color_id=p_color_id, tamanho=p_tamanho,
      estoque=p_estoque
    where id=p_id returning id into v_id;
    if v_id is null then raise exception 'registro não encontrado'; end if;
  end if;
  return v_id;
end $$;

create or replace function admin_delete_size(p_secret text, p_id uuid)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  perform assert_admin(p_secret);
  delete from product_sizes where id = p_id;
end $$;

create or replace function admin_list_categorias(p_secret text)
returns jsonb language plpgsql security definer set search_path = public, extensions stable as $$
begin
  perform assert_admin(p_secret);
  return coalesce((select jsonb_agg(to_jsonb(c) order by c.grupo, c.ordem, c.nome) from categorias c), '[]'::jsonb);
end $$;

create or replace function admin_upsert_categoria(
  p_secret text, p_id uuid, p_grupo text, p_nome text, p_slug text, p_ordem int,
  p_ativo boolean, p_desconto_atacado_percentual int
) returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid; v_slug text;
begin
  perform assert_admin(p_secret);
  v_slug := coalesce(nullif(trim(p_slug),''), _slugify(p_nome));
  if p_id is null then
    insert into categorias(grupo, nome, slug, ordem, ativo, desconto_atacado_percentual)
    values (p_grupo, p_nome, v_slug, coalesce(p_ordem,0), coalesce(p_ativo,true),
      p_desconto_atacado_percentual)
    returning id into v_id;
  else
    update categorias set grupo=p_grupo, nome=p_nome, slug=v_slug, ordem=coalesce(p_ordem,0),
      ativo=coalesce(p_ativo,true), desconto_atacado_percentual=p_desconto_atacado_percentual
    where id=p_id returning id into v_id;
    if v_id is null then raise exception 'registro não encontrado'; end if;
  end if;
  return v_id;
end $$;

create or replace function admin_delete_categoria(p_secret text, p_id uuid)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  perform assert_admin(p_secret);
  if exists (select 1 from products where categoria_id = p_id) then
    raise exception 'categoria tem produtos';
  end if;
  delete from categorias where id = p_id;
end $$;

create or replace function admin_list_orders(p_secret text, p_filtro text default 'todos')
returns jsonb language plpgsql security definer set search_path = public, extensions stable as $$
begin
  perform assert_admin(p_secret);
  return coalesce((
    select jsonb_agg(
      (_order_json(o.id) || jsonb_build_object(
        'cliente_telefone', o.cliente_telefone, 'mp_payment_id', o.mp_payment_id,
        'forma_pagamento', o.forma_pagamento, 'revendedor_id', o.revendedor_id))
      order by o.created_at desc)
    from orders o
    where (p_filtro = 'todos' or p_filtro is null)
       or (p_filtro = 'varejo'  and o.is_atacado = false)
       or (p_filtro = 'atacado' and o.is_atacado = true)
  ), '[]'::jsonb);
end $$;

create or replace function admin_update_order_status(p_secret text, p_id uuid, p_status order_status)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  perform assert_admin(p_secret);
  update orders set status = p_status where id = p_id;
end $$;

-- Liquidação manual pelo painel quando o webhook não chegou: reaproveita
-- _settle_order (baixa estoque + grava `sales`) em vez de só trocar o enum,
-- que perderia a venda do razão. Idempotente: só age se o pedido está pendente.
create or replace function admin_settle_order(
  p_secret text, p_order_id uuid, p_forma_pagamento text default 'Manual'
) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_ord orders;
begin
  perform assert_admin(p_secret);
  select * into v_ord from orders where id = p_order_id for update;
  if not found then raise exception 'pedido não encontrado'; end if;
  if v_ord.status <> 'pendente' then
    return jsonb_build_object('ok', true, 'already', true);
  end if;
  perform _settle_order(p_order_id, 'manual-' || gen_random_uuid()::text,
    coalesce(p_forma_pagamento, 'Manual'));
  return jsonb_build_object('ok', true);
end $$;

create or replace function admin_list_sales(p_secret text, p_filtro text default 'todos')
returns jsonb language plpgsql security definer set search_path = public, extensions stable as $$
begin
  perform assert_admin(p_secret);
  return coalesce((select jsonb_agg(to_jsonb(s) order by s.created_at desc) from sales s
    where (coalesce(p_filtro,'todos') = 'todos')
       or (p_filtro = 'varejo'  and s.is_atacado = false)
       or (p_filtro = 'atacado' and s.is_atacado = true)), '[]'::jsonb);
end $$;

create or replace function admin_insert_sale(
  p_secret text, p_produto_id uuid, p_produto_nome text, p_quantidade int, p_preco_unit numeric,
  p_valor_total numeric, p_forma_pagamento text, p_cliente text, p_produto_cor text,
  p_produto_tamanho text, p_size_id uuid, p_is_atacado boolean
) returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  perform assert_admin(p_secret);
  insert into sales(produto_id,produto_nome,quantidade,preco_unit,valor_total,forma_pagamento,
    cliente,origem,is_atacado,produto_cor,produto_tamanho,status)
  values (p_produto_id,p_produto_nome,p_quantidade,p_preco_unit,p_valor_total,p_forma_pagamento,
    p_cliente,'manual',coalesce(p_is_atacado,false),p_produto_cor,p_produto_tamanho,'aprovado');
  if p_size_id is not null then
    update product_sizes set estoque = greatest(0, estoque - p_quantidade) where id = p_size_id;
  end if;
end $$;

create or replace function admin_delete_sale(p_secret text, p_id uuid)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  perform assert_admin(p_secret);
  delete from sales where id = p_id;
end $$;

create or replace function admin_get_config(p_secret text)
returns jsonb language plpgsql security definer set search_path = public, extensions stable as $$
begin
  perform assert_admin(p_secret);
  return (select jsonb_build_object('taxa_entrega_local', taxa_entrega_local,
    'whatsapp', whatsapp, 'cidade_taxa', cidade_taxa) from admin_config where id = 1);
end $$;

create or replace function admin_set_config(p_secret text, p_taxa numeric, p_whatsapp text, p_cidade text)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  perform assert_admin(p_secret);
  update admin_config set taxa_entrega_local = coalesce(p_taxa,0),
    whatsapp = coalesce(p_whatsapp,''), cidade_taxa = coalesce(p_cidade,'') where id = 1;
end $$;


-- =====================================================================
-- PARTE 3 (Task 9) — COLUNA webhook_secret_hash + assert_webhook + RPC de pagamento
-- =====================================================================

alter table admin_config add column if not exists webhook_secret_hash text not null default '';

create or replace function assert_webhook(p_secret text)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare ok boolean;
begin
  select (webhook_secret_hash <> '' and webhook_secret_hash = crypt(p_secret, webhook_secret_hash))
    into ok from admin_config where id = 1;
  if not coalesce(ok,false) then raise exception 'não autorizado' using errcode='28000'; end if;
end $$;

-- Corpo interno da liquidação: status => 'pago', grava pagamento, baixa estoque
-- e insere uma linha em `sales` por item. NÃO é security definer nem valida
-- segredo — só é chamado pelas duas RPCs definer abaixo (webhook + painel).
create or replace function _settle_order(
  p_order_id uuid, p_mp_payment_id text, p_forma_pagamento text
) returns void language plpgsql set search_path = public, extensions as $$
declare v_ord orders; v_it order_items;
begin
  select * into v_ord from orders where id = p_order_id;
  if not found then raise exception 'pedido não encontrado'; end if;

  update orders set status = 'pago', mp_payment_id = p_mp_payment_id,
    forma_pagamento = p_forma_pagamento where id = p_order_id;

  for v_it in select * from order_items where order_id = p_order_id loop
    if v_it.size_id is not null then
      update product_sizes set estoque = greatest(0, estoque - v_it.quantidade)
      where id = v_it.size_id;
    end if;
    insert into sales(produto_id, produto_nome, quantidade, preco_unit, valor_total,
      forma_pagamento, cliente, origem, is_atacado, produto_cor, produto_tamanho,
      mp_payment_id, status, order_id)
    values (v_it.produto_id, v_it.produto_nome, v_it.quantidade, v_it.preco_unit, v_it.subtotal,
      p_forma_pagamento, v_ord.cliente_nome,
      case when v_ord.is_atacado then 'atacado' else 'loja' end,
      v_ord.is_atacado, v_it.produto_cor, v_it.produto_tamanho,
      p_mp_payment_id, 'aprovado', p_order_id);
  end loop;
end $$;

-- Assinatura antiga (4 args) é removida porque o novo p_transaction_amount criaria
-- uma sobrecarga em vez de substituir. `if exists` mantém o re-paste idempotente.
drop function if exists mp_register_order_payment(text, uuid, text, text);

create or replace function mp_register_order_payment(
  p_secret text, p_order_id uuid, p_mp_payment_id text, p_forma_pagamento text,
  p_transaction_amount numeric default null
) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_ord orders;
begin
  perform assert_webhook(p_secret);
  select * into v_ord from orders where id = p_order_id for update;
  if not found then raise exception 'pedido não encontrado'; end if;

  -- idempotência: pedido já liquidado, ou o mesmo pagamento já registrado => no-op.
  -- (Mercado Pago pode enviar um segundo pagamento p/ a mesma preference: retry, pagamento
  --  recriado, notificação duplicada com novo id — não pode baixar estoque duas vezes.)
  if v_ord.status <> 'pendente'
     or (v_ord.mp_payment_id is not null and v_ord.mp_payment_id = p_mp_payment_id) then
    return jsonb_build_object('ok', true, 'already', true);
  end if;

  -- Defesa em profundidade contra o C1: se o MP cobrou menos que o total do
  -- pedido, não liquida — deixa `pendente` e sinaliza no log.
  if p_transaction_amount is not null
     and p_transaction_amount < v_ord.valor_total - 0.01 then
    raise warning 'pagamento abaixo do esperado: pedido % esperava % recebeu %',
      p_order_id, v_ord.valor_total, p_transaction_amount;
    return jsonb_build_object('ok', false, 'reason', 'valor_abaixo_do_esperado',
      'esperado', v_ord.valor_total, 'recebido', p_transaction_amount);
  end if;

  perform _settle_order(p_order_id, p_mp_payment_id, p_forma_pagamento);

  return jsonb_build_object('ok', true);
end $$;


-- =====================================================================
-- HARDENING — revogar EXECUTE de helpers internos e asserts.
-- PostgREST concede EXECUTE a `anon` por padrão; sem isto qualquer um chama
-- assert_admin('chute') na taxa da API (oráculo de senha).
-- NÃO revogar admin_*, public_*, checkout_iniciar_pedido, mp_register_order_payment:
-- o app chama esses com a chave anon por design.
-- =====================================================================
revoke execute on function
  assert_admin(text), assert_webhook(text),
  _order_json(uuid), _product_json(products), _slugify(text),
  _preco_varejo(numeric,int), _preco_atacado(numeric,numeric,int),
  _settle_order(uuid,text,text)
from public, anon, authenticated;
