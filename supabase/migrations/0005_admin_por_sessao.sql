-- =====================================================================
-- 0005_admin_por_sessao.sql — RPCs admin_* autenticadas por sessão + papel
-- Substitui as admin_* de 0002_functions.sql: sai o parâmetro p_secret e o
-- assert_admin (senha única); entra assert_papel(array[...]) conforme a matriz
-- do spec §4.4. Corpos idênticos aos de 0002, exceto a autorização e o
-- mascaramento de valores para supervisor em admin_list_sales.
-- A assinatura antiga é derrubada antes porque remover p_secret muda a
-- assinatura (create or replace criaria uma sobrecarga em vez de substituir).
-- Webhook (assert_webhook, mp_register_order_payment, _settle_order) não muda.
-- admin_config.secret_hash permanece (coluna legada; dados não são apagados).
-- =====================================================================

set search_path = public, extensions;

-- ========== PRODUTOS ==========
drop function if exists admin_list_products(text);
create or replace function admin_list_products()
returns jsonb language plpgsql security definer set search_path = public, extensions stable as $$
begin
  perform assert_papel(array['superadmin','admin']);
  return coalesce((select jsonb_agg(_product_json(p) order by p.ordem, p.nome) from products p), '[]'::jsonb);
end $$;

drop function if exists admin_upsert_product(text, uuid, text, uuid, text, numeric, int, numeric, text, text[], boolean, boolean, int, text);
create or replace function admin_upsert_product(
  p_id uuid, p_nome text, p_categoria_id uuid, p_colecao text,
  p_preco numeric, p_desconto_percentual int, p_preco_atacado numeric, p_descricao text,
  p_caracteristicas text[], p_ativo boolean, p_destaque boolean, p_ordem int, p_slug text
) returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid; v_slug text;
begin
  perform assert_papel(array['superadmin','admin']);
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

drop function if exists admin_delete_product(text, uuid);
create or replace function admin_delete_product(p_id uuid)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  perform assert_papel(array['superadmin','admin']);
  delete from products where id = p_id;
end $$;

drop function if exists admin_set_ativo(text, uuid, boolean);
create or replace function admin_set_ativo(p_id uuid, p_ativo boolean)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  perform assert_papel(array['superadmin','admin']);
  update products set ativo = p_ativo where id = p_id;
end $$;

drop function if exists admin_set_desconto(text, uuid, int);
create or replace function admin_set_desconto(p_id uuid, p_desconto_percentual int)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  perform assert_papel(array['superadmin','admin']);
  update products set desconto_percentual = nullif(p_desconto_percentual,0) where id = p_id;
end $$;

drop function if exists admin_set_surpresa(text, uuid, boolean);
create or replace function admin_set_surpresa(p_id uuid, p_ativo boolean)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  perform assert_papel(array['superadmin','admin']);
  if p_id is null then raise exception 'id obrigatório'; end if;
  if p_ativo then update products set surpresa_ativo = (id = p_id);
  else update products set surpresa_ativo = false where id = p_id; end if;
end $$;

-- Versão antiga (com p_secret) veio do release-unico.sql anterior; pode não existir.
drop function if exists admin_set_destaque(text, uuid, boolean);
create or replace function admin_set_destaque(p_id uuid, p_destaque boolean)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  perform assert_papel(array['superadmin','admin']);
  update products set destaque = p_destaque where id = p_id;
end $$;

-- ========== CORES E TAMANHOS ==========
drop function if exists admin_upsert_color(text, uuid, uuid, text, text, text[], int);
create or replace function admin_upsert_color(
  p_id uuid, p_product_id uuid, p_nome text, p_hex text,
  p_imagens text[], p_ordem int
) returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid;
begin
  perform assert_papel(array['superadmin','admin']);
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

drop function if exists admin_delete_color(text, uuid);
create or replace function admin_delete_color(p_id uuid)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  perform assert_papel(array['superadmin','admin']);
  delete from product_colors where id = p_id;
end $$;

drop function if exists admin_upsert_size(text, uuid, uuid, text, int);
create or replace function admin_upsert_size(
  p_id uuid, p_color_id uuid, p_tamanho text, p_estoque int
) returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid;
begin
  perform assert_papel(array['superadmin','admin']);
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

drop function if exists admin_delete_size(text, uuid);
create or replace function admin_delete_size(p_id uuid)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  perform assert_papel(array['superadmin','admin']);
  delete from product_sizes where id = p_id;
end $$;

-- ========== CATEGORIAS ==========
drop function if exists admin_list_categorias(text);
create or replace function admin_list_categorias()
returns jsonb language plpgsql security definer set search_path = public, extensions stable as $$
begin
  perform assert_papel(array['superadmin','admin']);
  return coalesce((select jsonb_agg(to_jsonb(c) order by c.grupo, c.ordem, c.nome) from categorias c), '[]'::jsonb);
end $$;

drop function if exists admin_upsert_categoria(text, uuid, text, text, text, int, boolean, int);
create or replace function admin_upsert_categoria(
  p_id uuid, p_grupo text, p_nome text, p_slug text, p_ordem int,
  p_ativo boolean, p_desconto_atacado_percentual int
) returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid; v_slug text;
begin
  perform assert_papel(array['superadmin','admin']);
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

drop function if exists admin_delete_categoria(text, uuid);
create or replace function admin_delete_categoria(p_id uuid)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  perform assert_papel(array['superadmin','admin']);
  if exists (select 1 from products where categoria_id = p_id) then
    raise exception 'categoria tem produtos';
  end if;
  delete from categorias where id = p_id;
end $$;

-- ========== PEDIDOS ==========
drop function if exists admin_list_orders(text, text);
create or replace function admin_list_orders(p_filtro text default 'todos')
returns jsonb language plpgsql security definer set search_path = public, extensions stable as $$
begin
  perform assert_papel(array['superadmin','admin','supervisor']);
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

drop function if exists admin_update_order_status(text, uuid, order_status);
create or replace function admin_update_order_status(p_id uuid, p_status order_status)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  perform assert_papel(array['superadmin','admin','supervisor']);
  update orders set status = p_status where id = p_id;
end $$;

-- Liquidação manual pelo painel quando o webhook não chegou: reaproveita
-- _settle_order (baixa estoque + grava `sales`) em vez de só trocar o enum,
-- que perderia a venda do razão. Idempotente: só age se o pedido está pendente.
drop function if exists admin_settle_order(text, uuid, text);
create or replace function admin_settle_order(
  p_order_id uuid, p_forma_pagamento text default 'Manual'
) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_ord orders;
begin
  perform assert_papel(array['superadmin','admin','supervisor']);
  select * into v_ord from orders where id = p_order_id for update;
  if not found then raise exception 'pedido não encontrado'; end if;
  if v_ord.status <> 'pendente' then
    return jsonb_build_object('ok', true, 'already', true);
  end if;
  perform _settle_order(p_order_id, 'manual-' || gen_random_uuid()::text,
    coalesce(p_forma_pagamento, 'Manual'));
  return jsonb_build_object('ok', true);
end $$;

-- ========== VENDAS ==========
-- Supervisor acompanha vendas sem o financeiro: preco_unit e valor_total saem nulos
-- (mesmas chaves e mesma ordenação do retorno original).
drop function if exists admin_list_sales(text, text);
create or replace function admin_list_sales(p_filtro text default 'todos')
returns jsonb language plpgsql security definer set search_path = public, extensions stable as $$
declare v_papel text;
begin
  v_papel := assert_papel(array['superadmin','admin','supervisor']);
  return coalesce((select jsonb_agg(
      case when v_papel = 'supervisor'
        then to_jsonb(s) || jsonb_build_object('preco_unit', null, 'valor_total', null)
        else to_jsonb(s) end
      order by s.created_at desc) from sales s
    where (coalesce(p_filtro,'todos') = 'todos')
       or (p_filtro = 'varejo'  and s.is_atacado = false)
       or (p_filtro = 'atacado' and s.is_atacado = true)), '[]'::jsonb);
end $$;

drop function if exists admin_insert_sale(text, uuid, text, int, numeric, numeric, text, text, text, text, uuid, boolean);
create or replace function admin_insert_sale(
  p_produto_id uuid, p_produto_nome text, p_quantidade int, p_preco_unit numeric,
  p_valor_total numeric, p_forma_pagamento text, p_cliente text, p_produto_cor text,
  p_produto_tamanho text, p_size_id uuid, p_is_atacado boolean
) returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  perform assert_papel(array['superadmin','admin']);
  insert into sales(produto_id,produto_nome,quantidade,preco_unit,valor_total,forma_pagamento,
    cliente,origem,is_atacado,produto_cor,produto_tamanho,status)
  values (p_produto_id,p_produto_nome,p_quantidade,p_preco_unit,p_valor_total,p_forma_pagamento,
    p_cliente,'manual',coalesce(p_is_atacado,false),p_produto_cor,p_produto_tamanho,'aprovado');
  if p_size_id is not null then
    update product_sizes set estoque = greatest(0, estoque - p_quantidade) where id = p_size_id;
  end if;
end $$;

drop function if exists admin_delete_sale(text, uuid);
create or replace function admin_delete_sale(p_id uuid)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  perform assert_papel(array['superadmin','admin']);
  delete from sales where id = p_id;
end $$;

-- ========== CONFIG DO SISTEMA (só superadmin) ==========
drop function if exists admin_get_config(text);
create or replace function admin_get_config()
returns jsonb language plpgsql security definer set search_path = public, extensions stable as $$
begin
  perform assert_papel(array['superadmin']);
  return (select jsonb_build_object('taxa_entrega_local', taxa_entrega_local,
    'whatsapp', whatsapp, 'cidade_taxa', cidade_taxa) from admin_config where id = 1);
end $$;

drop function if exists admin_set_config(text, numeric, text, text);
create or replace function admin_set_config(p_taxa numeric, p_whatsapp text, p_cidade text)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  perform assert_papel(array['superadmin']);
  update admin_config set taxa_entrega_local = coalesce(p_taxa,0),
    whatsapp = coalesce(p_whatsapp,''), cidade_taxa = coalesce(p_cidade,'') where id = 1;
end $$;

-- ========== LEGADO DA SENHA ÚNICA ==========
-- RPCs de revendedor com p_secret do release-unico.sql anterior (podem não existir;
-- a Task do atacado recria com assinatura nova). Derrubadas para que nenhuma
-- função remanescente dependa de assert_admin.
drop function if exists admin_list_revendedores(text, text);
drop function if exists admin_set_revendedor_status(text, uuid, revendedor_status);
drop function if exists admin_upsert_revendedor(text, uuid, text, text);

drop function if exists admin_set_secret(text, text);
drop function if exists assert_admin(text);

-- ========== PRIVILÉGIOS ==========
-- O Supabase concede EXECUTE a anon/authenticated por padrão; nada aqui é público.
revoke all on function
  admin_list_products(),
  admin_upsert_product(uuid, text, uuid, text, numeric, int, numeric, text, text[], boolean, boolean, int, text),
  admin_delete_product(uuid),
  admin_set_ativo(uuid, boolean),
  admin_set_desconto(uuid, int),
  admin_set_surpresa(uuid, boolean),
  admin_set_destaque(uuid, boolean),
  admin_upsert_color(uuid, uuid, text, text, text[], int),
  admin_delete_color(uuid),
  admin_upsert_size(uuid, uuid, text, int),
  admin_delete_size(uuid),
  admin_list_categorias(),
  admin_upsert_categoria(uuid, text, text, text, int, boolean, int),
  admin_delete_categoria(uuid),
  admin_list_orders(text),
  admin_update_order_status(uuid, order_status),
  admin_settle_order(uuid, text),
  admin_list_sales(text),
  admin_insert_sale(uuid, text, int, numeric, numeric, text, text, text, text, uuid, boolean),
  admin_delete_sale(uuid),
  admin_get_config(),
  admin_set_config(numeric, text, text)
from public, anon, authenticated;

grant execute on function
  admin_list_products(),
  admin_upsert_product(uuid, text, uuid, text, numeric, int, numeric, text, text[], boolean, boolean, int, text),
  admin_delete_product(uuid),
  admin_set_ativo(uuid, boolean),
  admin_set_desconto(uuid, int),
  admin_set_surpresa(uuid, boolean),
  admin_set_destaque(uuid, boolean),
  admin_upsert_color(uuid, uuid, text, text, text[], int),
  admin_delete_color(uuid),
  admin_upsert_size(uuid, uuid, text, int),
  admin_delete_size(uuid),
  admin_list_categorias(),
  admin_upsert_categoria(uuid, text, text, text, int, boolean, int),
  admin_delete_categoria(uuid),
  admin_list_orders(text),
  admin_update_order_status(uuid, order_status),
  admin_settle_order(uuid, text),
  admin_list_sales(text),
  admin_insert_sale(uuid, text, int, numeric, numeric, text, text, text, text, uuid, boolean),
  admin_delete_sale(uuid),
  admin_get_config(),
  admin_set_config(numeric, text, text)
to authenticated;
