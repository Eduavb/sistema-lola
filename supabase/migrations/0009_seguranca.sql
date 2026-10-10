-- =====================================================================
-- 0009_seguranca.sql — endurecimento pós-lançamento.
--   1. "Meus pedidos" só para quem está logado: nova RPC meus_pedidos() e
--      remoção do acesso público a public_lookup_orders (expunha nome,
--      endereço e itens de qualquer telefone digitado).
--   2. Menos privilégio nas tabelas legadas: anon/authenticated não precisam
--      de INSERT/UPDATE/DELETE (tudo passa por RPCs SECURITY DEFINER).
--      O RLS já bloqueava; aqui o GRANT deixa de depender só dele.
-- Idempotente: pode rodar mais de uma vez. NÃO entra no release-unico.sql.
-- =====================================================================

set search_path = public, extensions;

-- 1) Meus pedidos (cliente logado vê só os pedidos da própria conta)
create or replace function meus_pedidos()
returns jsonb language sql security definer stable set search_path = public, extensions as $$
  select coalesce(jsonb_agg(_order_json(x.id) order by x.created_at desc), '[]'::jsonb)
  from (
    select o.id, o.created_at from orders o
    where auth.uid() is not null and o.customer_id = auth.uid()
    order by o.created_at desc
    limit 100
  ) x;
$$;

revoke all on function meus_pedidos() from public, anon;
grant execute on function meus_pedidos() to authenticated;

revoke execute on function public_lookup_orders(text) from public, anon, authenticated;

-- 2) Menos privilégio nas tabelas legadas
revoke all on admin_config from anon, authenticated;
revoke all on sales from anon, authenticated;
revoke all on orders, order_items from anon;
revoke insert, update, delete, truncate, references, trigger
  on orders, order_items from authenticated;
revoke insert, update, delete, truncate, references, trigger
  on categorias, products, product_colors, product_sizes from anon, authenticated;
