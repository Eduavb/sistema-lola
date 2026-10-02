-- =====================================================================
-- 0008_checkout_atacado.sql — checkout de atacado e identidade do pedido
-- vinda da sessão.
-- Autoridade: spec do release §8.2, §9; spec-mãe §8.4, §11.3-11.5, §12.
--
-- checkout_iniciar_pedido:
--   * Assinatura nova SEM p_customer_id e p_revendedor_id (antes o cliente
--     podia injetar pedidos na conta de outra pessoa). customer_id = auth.uid()
--     (nulo para convidado); revendedor_id vem de _atacado_revendedor_aprovado().
--   * Varejo: corpo de 0007 (preço com _desconto_efetivo), só muda a origem de
--     customer_id/revendedor_id.
--   * Atacado (p_is_atacado = true): exige revendedor aprovado com perfil ativo;
--     itens lidos de carrinho_atacado do servidor (p_items é ignorado); preço por
--     _preco_atacado (nunca desconto de varejo); estoque por linha; mínimo de 12
--     SKUs distintos. NÃO limpa o carrinho: isso acontece ao liquidar.
-- _settle_order: corpo de 0002 + limpeza do carrinho de atacado do revendedor
--   do pedido (mp_register_order_payment e admin_settle_order já chamam só com
--   o pedido 'pendente' e travado, então a liquidação continua única).
-- =====================================================================

set search_path = public, extensions;

-- ========== CHECKOUT ==========
-- Assinatura antiga (13 args) removida: create or replace com menos argumentos
-- criaria uma sobrecarga e manteria a porta aberta.
drop function if exists checkout_iniciar_pedido(
  text, text, entrega_tipo, text, text, text, text, text, text, jsonb, boolean, uuid, uuid);

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
  p_items jsonb,               -- varejo: [{produto_id,color_id,size_id,quantidade}]; atacado: ignorado
  p_is_atacado boolean default false
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
  v_uid uuid := auth.uid();
  v_rev uuid;
  v_ca carrinho_atacado;
  v_pct int;
  v_skus int;
begin
  -- ===== ATACADO =====
  if coalesce(p_is_atacado, false) then
    -- Lança 'revendedor não aprovado' sem sessão, sem revendedor aprovado ou
    -- com perfil inativo. Nada do payload identifica o revendedor.
    v_rev := _atacado_revendedor_aprovado();

    if not exists (select 1 from carrinho_atacado where revendedor_id = v_rev) then
      raise exception 'carrinho vazio';
    end if;

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
      true, v_uid, v_rev, 0, 0)
    returning id into v_order_id;

    -- Mesma ordem de trava do varejo (size_id crescente) => deadlock-safe entre os dois.
    for v_ca in
      select ca.* from carrinho_atacado ca
      where ca.revendedor_id = v_rev
      order by ca.size_id
    loop
      select * into v_prod from products where id = v_ca.product_id;
      if not found then raise exception 'produto indisponível'; end if;
      if not v_prod.ativo then
        raise exception 'produto indisponível: %', v_prod.nome;
      end if;
      select * into v_color from product_colors
        where id = v_ca.color_id and product_id = v_prod.id;
      if not found then raise exception 'cor indisponível: %', v_prod.nome; end if;
      select * into v_size from product_sizes
        where id = v_ca.size_id and color_id = v_color.id
        for update;
      if not found then raise exception 'tamanho indisponível: %', v_prod.nome; end if;

      -- Um size_id só aparece uma vez por revendedor (unique + checagens de
      -- cor/tamanho acima), então a linha é o total pedido daquele SKU.
      if v_size.estoque < v_ca.quantidade then
        raise exception 'estoque insuficiente: % - % - % (disponível: %)',
          v_prod.nome, v_color.nome, v_size.tamanho, v_size.estoque;
      end if;

      v_pct := null;
      select c.desconto_atacado_percentual into v_pct from categorias c where c.id = v_prod.categoria_id;
      v_preco := _preco_atacado(v_prod.preco, v_prod.preco_atacado, v_pct);
      v_qtd := v_ca.quantidade;
      v_prod_total := v_prod_total + v_preco * v_qtd;

      insert into order_items(order_id, produto_id, produto_nome, produto_cor, produto_tamanho,
        color_id, size_id, quantidade, preco_unit, subtotal)
      values (v_order_id, v_prod.id, v_prod.nome, v_color.nome, v_size.tamanho,
        v_color.id, v_size.id, v_qtd, v_preco, v_preco * v_qtd);

      v_mp_itens := v_mp_itens || jsonb_build_object(
        'titulo', concat_ws(' - ', v_prod.nome, v_color.nome, v_size.tamanho),
        'quantidade', v_qtd,
        'preco_unit', v_preco);
    end loop;

    -- Conta sobre o que de fato foi gravado no pedido. A exceção desfaz o
    -- pedido inteiro (nenhum pedido é criado abaixo do mínimo).
    select count(distinct (i.produto_id, i.color_id, i.size_id))::int into v_skus
    from order_items i where i.order_id = v_order_id;
    if v_skus < 12 then
      raise exception 'mínimo de 12 SKUs distintos (carrinho tem %)', v_skus;
    end if;

    update orders set valor_produtos = v_prod_total,
                      valor_total = v_prod_total + coalesce(v_taxa,0)
    where id = v_order_id;

    return jsonb_build_object('id', v_order_id, 'entrega_taxa', coalesce(v_taxa, 0),
      'itens', coalesce(v_mp_itens, '[]'::jsonb));
  end if;

  -- ===== VAREJO (corpo de 0007; customer_id da sessão, revendedor_id nulo) =====
  if jsonb_array_length(coalesce(p_items,'[]'::jsonb)) = 0 then
    raise exception 'carrinho vazio';
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
    false, v_uid, null, 0, 0)
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

    v_preco := _preco_varejo(v_prod.preco, _desconto_efetivo(v_prod));
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

-- ========== LIQUIDAÇÃO ==========
-- Corpo de 0002; acréscimo: pedido de atacado esvazia o carrinho do revendedor.
-- Continua sem security definer e sem grant (só as RPCs definer o chamam).
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

  if v_ord.is_atacado and v_ord.revendedor_id is not null then
    perform atacado_cart_clear_for(v_ord.revendedor_id);
  end if;
end $$;

-- ========== PRIVILÉGIOS ==========
-- checkout_iniciar_pedido é público por design (compra de convidado). O ramo
-- de atacado se protege sozinho (_atacado_revendedor_aprovado exige sessão).
revoke all on function
  checkout_iniciar_pedido(text, text, entrega_tipo, text, text, text, text, text, text, jsonb, boolean)
from public;
grant execute on function
  checkout_iniciar_pedido(text, text, entrega_tipo, text, text, text, text, text, text, jsonb, boolean)
to anon, authenticated;

-- create or replace preserva o ACL; repetido para re-paste idempotente.
revoke all on function
  _settle_order(uuid, text, text),
  atacado_cart_clear_for(uuid)
from public, anon, authenticated;
