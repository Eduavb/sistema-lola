-- =====================================================================
-- 0006_atacado.sql — revendedores, carrinho de atacado persistente e RPCs
-- Autoridade: spec do release §7 (Revendedores), §8, §9; spec-mãe §5.4, §5.5,
-- §6.4, §7, §11.
-- Regras centrais:
--   * Acesso ao atacado = revendedores.status = 'aprovado' do auth.uid(),
--     NUNCA só o papel do perfil.
--   * Preço de atacado sempre calculado no servidor (_preco_atacado).
--   * Vínculo conta <-> revendedor por e-mail só com e-mail confirmado.
--   * Metadado do cliente nunca concede papel de equipe.
-- checkout_iniciar_pedido e _settle_order NÃO mudam aqui (Task 9 usa
-- atacado_cart_clear_for).
-- =====================================================================

set search_path = public, extensions;

-- ========== TABELA ANTIGA (release-unico.sql anterior: nome, cidade) ==========
-- Se a versão de duas colunas chegou a ser aplicada, é preservada como legado
-- em vez de apagada; a nova tabela nasce limpa.
-- Constraints e índices também são renomeados (o novo revendedores_pkey colidiria).
do $$
declare r record;
begin
  if exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'revendedores' and c.relkind = 'r'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'revendedores'
      and column_name = 'razao_social'
  ) then
    if exists (
      select 1 from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = 'revendedores_legado'
    ) then
      raise exception 'revendedores antiga e revendedores_legado coexistem; resolver manualmente';
    end if;
    alter table public.revendedores rename to revendedores_legado;
    for r in
      select con.conname from pg_constraint con
      where con.conrelid = 'public.revendedores_legado'::regclass
        and con.conname like 'revendedores%'
    loop
      execute format('alter table public.revendedores_legado rename constraint %I to %I',
        r.conname, 'legado_' || r.conname);
    end loop;
    for r in
      select ic.relname from pg_index i
      join pg_class ic on ic.oid = i.indexrelid
      where i.indrelid = 'public.revendedores_legado'::regclass
        and ic.relname like 'revendedores%'
    loop
      execute format('alter index public.%I rename to %I', r.relname, 'legado_' || r.relname);
    end loop;
    alter table public.revendedores_legado enable row level security;
    revoke all on table public.revendedores_legado from anon, authenticated;
  end if;
end $$;

-- ========== TABELAS ==========
create table if not exists revendedores (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid unique references auth.users(id) on delete set null,
  razao_social text not null check (razao_social <> ''),
  cnpj         text,
  responsavel  text not null default '',
  email        text not null check (email = lower(email) and email <> ''),
  whatsapp     text not null default '',
  cidade       text not null default '',
  uf           text not null default '',
  status       revendedor_status not null default 'pendente',
  created_at   timestamptz not null default now(),
  reviewed_at  timestamptz,
  reviewed_by  uuid
);
create unique index if not exists revendedores_email_key on revendedores(email);
create index if not exists revendedores_status_idx on revendedores(status);

-- size_id obrigatório: SKU de atacado = produto + cor + tamanho (estoque vive no tamanho).
create table if not exists carrinho_atacado (
  id            uuid primary key default gen_random_uuid(),
  revendedor_id uuid not null references revendedores(id) on delete cascade,
  product_id    uuid not null references products(id) on delete cascade,
  color_id      uuid not null references product_colors(id) on delete cascade,
  size_id       uuid not null references product_sizes(id) on delete cascade,
  quantidade    int  not null check (quantidade > 0),
  updated_at    timestamptz not null default now(),
  unique (revendedor_id, product_id, color_id, size_id)
);
create index if not exists carrinho_atacado_product_idx on carrinho_atacado(product_id);
create index if not exists carrinho_atacado_color_idx   on carrinho_atacado(color_id);
create index if not exists carrinho_atacado_size_idx    on carrinho_atacado(size_id);

alter table revendedores     enable row level security;
alter table carrinho_atacado enable row level security;

drop policy if exists revendedores_self_select on revendedores;
create policy revendedores_self_select on revendedores
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists carrinho_atacado_self_select on carrinho_atacado;
create policy carrinho_atacado_self_select on carrinho_atacado
  for select to authenticated using (
    exists (
      select 1 from revendedores r
      where r.id = carrinho_atacado.revendedor_id
        and r.user_id = (select auth.uid())
    ));
-- Sem policies de escrita: tudo via RPC.

revoke all on table revendedores     from anon, authenticated;
revoke all on table carrinho_atacado from anon, authenticated;
grant select on table revendedores     to authenticated;
grant select on table carrinho_atacado to authenticated;

-- orders.revendedor_id existe desde 0001 como uuid solto. NOT VALID: não
-- revalida linhas antigas (que podem apontar para ids da tabela legada);
-- vale para toda escrita nova.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'orders'
      and column_name = 'revendedor_id'
  ) and not exists (
    select 1 from pg_constraint con
    join pg_attribute a on a.attrelid = con.conrelid and a.attnum = any(con.conkey)
    where con.conrelid = 'public.orders'::regclass
      and con.contype = 'f'
      and a.attname = 'revendedor_id'
  ) then
    alter table public.orders
      add constraint orders_revendedor_id_fkey
      foreign key (revendedor_id) references public.revendedores(id)
      on delete set null not valid;
  end if;
end $$;

-- ========== PEDIDOS DO PRÓPRIO CLIENTE (spec-mãe §5.5) ==========
-- customer_id nulo nunca casa (NULL = uid é NULL); só a própria linha.
drop policy if exists orders_customer_select on orders;
create policy orders_customer_select on orders
  for select to authenticated using (
    customer_id is not null and customer_id = (select auth.uid()));

drop policy if exists order_items_customer_select on order_items;
create policy order_items_customer_select on order_items
  for select to authenticated using (
    exists (
      select 1 from orders o
      where o.id = order_items.order_id
        and o.customer_id is not null
        and o.customer_id = (select auth.uid())
    ));

-- ========== TRIGGER EM auth.users (estende 0004) ==========
-- Corpo de 0004 preservado (lock, convite de uso único só com e-mail
-- confirmado, nunca rebaixa equipe, metadado ignorado em linha existente).
-- Acréscimo (só com e-mail confirmado, sob o mesmo advisory lock):
--   1. conta ainda sem revendedor vinculado + revendedores com o mesmo e-mail
--      e user_id nulo (cadastro manual do admin) => vincula;
--   2. senão, metadado tipo='revendedor' e nenhum revendedor com o e-mail =>
--      cria linha 'pendente' com os metadados (truncados);
--   3. havendo vínculo, perfil 'cliente' passa a 'revendedor'. Nada mais muda
--      de papel aqui; equipe nunca vem de metadado.
-- Falha no bloco de revendedor vira warning: o cadastro/confirmação não quebra.
create or replace function public.handle_auth_user()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare
  v_email      text := lower(coalesce(new.email, ''));
  v_nome       text := left(coalesce(trim(new.raw_user_meta_data->>'nome'), ''), 200);
  v_convite    papel_usuario;
  v_inicial    papel_usuario;
  v_tipo_rev   boolean := coalesce(new.raw_user_meta_data->>'tipo', '') = 'revendedor';
  v_vinculado  boolean := false;
  v_razao      text;
begin
  if new.email_confirmed_at is not null and v_email <> '' then
    perform pg_advisory_xact_lock(hashtext('lola:profiles:papel'));
    select c.papel into v_convite from convites_papel c where c.email = v_email;
  end if;

  v_inicial := coalesce(
    v_convite,
    case when v_tipo_rev
         then 'revendedor'::papel_usuario
         else 'cliente'::papel_usuario end);

  insert into profiles as p (id, email, nome, papel)
  values (new.id, v_email, v_nome, v_inicial)
  on conflict (id) do update set
    email = excluded.email,
    nome  = case when p.nome = '' then excluded.nome else p.nome end,
    papel = case
      when v_convite is null then p.papel
      when p.papel in ('superadmin','admin','supervisor')
       and (case v_convite when 'superadmin' then 3 when 'admin' then 2
                           when 'supervisor' then 1 else 0 end)
         < (case p.papel   when 'superadmin' then 3 when 'admin' then 2
                           when 'supervisor' then 1 else 0 end)
        then p.papel
      else v_convite
    end;

  if v_convite is not null then
    delete from convites_papel where email = v_email;
  end if;

  if new.email_confirmed_at is not null and v_email <> '' then
    begin
      v_vinculado := exists (select 1 from revendedores r where r.user_id = new.id);

      if not v_vinculado then
        update revendedores set user_id = new.id
        where email = v_email and user_id is null;
        v_vinculado := found;
      end if;

      if not v_vinculado and v_tipo_rev
         and not exists (select 1 from revendedores r where r.email = v_email) then
        v_razao := left(coalesce(
          nullif(trim(left(coalesce(new.raw_user_meta_data->>'razao_social', ''), 400)), ''),
          nullif(v_nome, ''),
          v_email), 200);
        insert into revendedores
          (user_id, razao_social, cnpj, responsavel, email, whatsapp, status)
        values (
          new.id,
          v_razao,
          nullif(left(regexp_replace(
            left(coalesce(new.raw_user_meta_data->>'cnpj', ''), 200), '\D', '', 'g'), 20), ''),
          v_nome,
          v_email,
          left(regexp_replace(
            left(coalesce(new.raw_user_meta_data->>'whatsapp', ''), 200), '\D', '', 'g'), 20),
          'pendente')
        on conflict (email) do nothing;
        v_vinculado := found;
      end if;

      if v_vinculado then
        update profiles set papel = 'revendedor'
        where id = new.id and papel = 'cliente';
      end if;
    exception when others then
      raise warning 'handle_auth_user: vínculo de revendedor ignorado para %: %', new.id, sqlerrm;
    end;
  end if;

  return new;
end $$;

drop trigger if exists lola_on_auth_user on auth.users;
create trigger lola_on_auth_user
  after insert or update of email_confirmed_at, email on auth.users
  for each row execute function public.handle_auth_user();

-- ========== HELPERS INTERNOS ==========
-- id do revendedor aprovado do chamador (perfil ativo), ou erro.
create or replace function _atacado_revendedor_aprovado()
returns uuid language plpgsql security definer set search_path = public, extensions stable as $$
declare v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'revendedor não aprovado' using errcode = '42501';
  end if;
  select r.id into v_id
  from revendedores r
  join profiles p on p.id = r.user_id
  where r.user_id = auth.uid() and r.status = 'aprovado' and p.ativo;
  if v_id is null then
    raise exception 'revendedor não aprovado' using errcode = '42501';
  end if;
  return v_id;
end $$;

-- Esvazia o carrinho de um revendedor. Só para uso interno (webhook /
-- _settle_order, Task 9): sem grant a ninguém, sem security definer (roda no
-- contexto da função definer que a chama, como _settle_order).
create or replace function atacado_cart_clear_for(p_revendedor uuid)
returns void language plpgsql set search_path = public, extensions as $$
begin
  if p_revendedor is null then return; end if;
  delete from carrinho_atacado where revendedor_id = p_revendedor;
end $$;

-- ========== RPCs DO REVENDEDOR (spec-mãe §6.4) ==========
create or replace function atacado_me()
returns jsonb language plpgsql security definer set search_path = public, extensions stable as $$
begin
  if auth.uid() is null then return null; end if;
  return (
    select jsonb_build_object('id', r.id, 'status', r.status, 'razao_social', r.razao_social)
    from revendedores r where r.user_id = auth.uid());
end $$;

-- Preço: _preco_atacado(preco, override do produto, % da categoria) —
-- override > % da categoria > preço de tabela; desconto de varejo nunca entra.
create or replace function atacado_cart_get()
returns jsonb language plpgsql security definer set search_path = public, extensions stable as $$
declare
  v_rev   uuid := _atacado_revendedor_aprovado();
  v_itens jsonb;
  v_skus  int;
  v_total numeric;
begin
  with linhas as (
    select
      ca.id, ca.product_id, ca.color_id, ca.size_id, ca.quantidade, ca.updated_at,
      p.nome, p.slug, p.ativo,
      col.nome as cor,
      s.tamanho,
      s.estoque,
      col.imagens[1] as imagem,
      _preco_atacado(p.preco, p.preco_atacado, c.desconto_atacado_percentual) as preco_unit
    from carrinho_atacado ca
    join products p        on p.id = ca.product_id
    join categorias c      on c.id = p.categoria_id
    join product_colors col on col.id = ca.color_id and col.product_id = p.id
    join product_sizes s    on s.id = ca.size_id and s.color_id = col.id
    where ca.revendedor_id = v_rev
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'id', l.id, 'product_id', l.product_id, 'color_id', l.color_id, 'size_id', l.size_id,
      'nome', l.nome, 'slug', l.slug, 'ativo', l.ativo, 'cor', l.cor, 'tamanho', l.tamanho,
      'imagem', l.imagem, 'quantidade', l.quantidade,
      'preco_unit', l.preco_unit, 'preco_atacado', l.preco_unit,
      'estoque', l.estoque, 'subtotal', round(l.preco_unit * l.quantidade, 2))
      order by l.nome, l.cor, l.tamanho), '[]'::jsonb),
    count(distinct (l.product_id, l.color_id, l.size_id))::int,
    coalesce(sum(round(l.preco_unit * l.quantidade, 2)), 0)
  into v_itens, v_skus, v_total
  from linhas l;

  return jsonb_build_object('itens', v_itens, 'sku_distintos', v_skus, 'total', v_total);
end $$;

-- Quantidade absoluta; 0 remove. Não valida estoque (o aviso é na leitura).
create or replace function atacado_cart_set_item(
  p_product_id uuid, p_color_id uuid, p_size_id uuid, p_quantidade int
) returns void language plpgsql security definer set search_path = public, extensions as $$
declare
  v_rev   uuid := _atacado_revendedor_aprovado();
  v_ativo boolean;
begin
  if p_product_id is null or p_color_id is null or p_size_id is null then
    raise exception 'item inválido';
  end if;
  if p_quantidade is null or p_quantidade < 0 or p_quantidade > 999 then
    raise exception 'quantidade inválida';
  end if;

  if p_quantidade = 0 then
    delete from carrinho_atacado
    where revendedor_id = v_rev and product_id = p_product_id
      and color_id = p_color_id and size_id = p_size_id;
    return;
  end if;

  select p.ativo into v_ativo
  from product_sizes s
  join product_colors c on c.id = s.color_id
  join products p       on p.id = c.product_id
  where s.id = p_size_id and c.id = p_color_id and p.id = p_product_id;
  if not found then raise exception 'item inválido'; end if;
  if not v_ativo then raise exception 'produto indisponível'; end if;

  if not exists (
       select 1 from carrinho_atacado
       where revendedor_id = v_rev and product_id = p_product_id
         and color_id = p_color_id and size_id = p_size_id)
     and (select count(*) from carrinho_atacado where revendedor_id = v_rev) >= 300 then
    raise exception 'carrinho cheio';
  end if;

  insert into carrinho_atacado (revendedor_id, product_id, color_id, size_id, quantidade)
  values (v_rev, p_product_id, p_color_id, p_size_id, p_quantidade)
  on conflict (revendedor_id, product_id, color_id, size_id)
  do update set quantidade = excluded.quantidade, updated_at = now();
end $$;

create or replace function atacado_cart_remove_item(p_id uuid)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare v_rev uuid := _atacado_revendedor_aprovado();
begin
  delete from carrinho_atacado where id = p_id and revendedor_id = v_rev;
end $$;

create or replace function atacado_cart_clear()
returns void language plpgsql security definer set search_path = public, extensions as $$
declare v_rev uuid := _atacado_revendedor_aprovado();
begin
  delete from carrinho_atacado where revendedor_id = v_rev;
end $$;

-- Histórico vale para qualquer status (recusado depois ainda vê seus pedidos).
create or replace function atacado_my_orders()
returns jsonb language plpgsql security definer set search_path = public, extensions stable as $$
declare v_rev uuid;
begin
  if auth.uid() is null then return '[]'::jsonb; end if;
  select r.id into v_rev from revendedores r where r.user_id = auth.uid();
  if v_rev is null then return '[]'::jsonb; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', o.id, 'created_at', o.created_at, 'status', o.status,
      'valor_total', o.valor_total,
      'skus', (select count(distinct (i.produto_id, i.color_id, i.size_id))::int
               from order_items i where i.order_id = o.id))
      order by o.created_at desc)
    from orders o
    where o.is_atacado and o.revendedor_id = v_rev
  ), '[]'::jsonb);
end $$;

-- ========== RPCs DE ADMIN (spec §4.4) ==========
-- Assinaturas antigas com p_secret (release-unico.sql anterior); 0005 já as
-- derruba, repetido aqui para re-paste idempotente.
drop function if exists admin_list_revendedores(text, text);
drop function if exists admin_set_revendedor_status(text, uuid, revendedor_status);
drop function if exists admin_upsert_revendedor(text, uuid, text, text);

create or replace function admin_list_revendedores(p_status text default 'todos')
returns jsonb language plpgsql security definer set search_path = public, extensions stable as $$
begin
  perform assert_papel(array['superadmin','admin','supervisor']);
  if p_status is not null
     and p_status not in ('todos','pendente','aprovado','recusado') then
    raise exception 'status inválido';
  end if;
  return coalesce((
    select jsonb_agg(
      (to_jsonb(r) - 'user_id') || jsonb_build_object('tem_conta', r.user_id is not null)
      order by case r.status when 'pendente' then 0 else 1 end, r.created_at desc)
    from revendedores r
    where coalesce(p_status, 'todos') = 'todos' or r.status::text = p_status
  ), '[]'::jsonb);
end $$;

-- Cria sempre 'pendente' (supervisor cadastra mas não aprova). Ao ficar sem
-- conta vinculada, vincula a conta de e-mail confirmado com o mesmo e-mail e
-- eleva 'cliente' -> 'revendedor' (papéis de equipe intocados).
-- Supervisor trocando o e-mail de revendedor já revisado devolve-o a 'pendente'.
create or replace function admin_upsert_revendedor(
  p_id uuid, p_razao_social text, p_cnpj text, p_responsavel text, p_email text,
  p_whatsapp text, p_cidade text, p_uf text
) returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare
  v_meu      text;
  v_id       uuid;
  v_atual    revendedores;
  v_razao    text := left(trim(coalesce(p_razao_social, '')), 200);
  v_email    text := lower(trim(coalesce(p_email, '')));
  v_cnpj     text := nullif(left(regexp_replace(left(coalesce(p_cnpj, ''), 200), '\D', '', 'g'), 20), '');
  v_resp     text := left(trim(coalesce(p_responsavel, '')), 200);
  v_whats    text := left(regexp_replace(left(coalesce(p_whatsapp, ''), 200), '\D', '', 'g'), 20);
  v_cidade   text := left(trim(coalesce(p_cidade, '')), 200);
  v_uf       text := upper(left(trim(coalesce(p_uf, '')), 2));
  v_user     uuid;
begin
  perform assert_papel(array['superadmin','admin','supervisor']);
  if v_razao = '' then raise exception 'razão social obrigatória'; end if;
  if length(v_email) > 200
     or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'e-mail inválido';
  end if;

  perform pg_advisory_xact_lock(hashtext('lola:profiles:papel'));
  v_meu := assert_papel(array['superadmin','admin','supervisor']);

  if p_id is null then
    begin
      insert into revendedores (razao_social, cnpj, responsavel, email, whatsapp, cidade, uf)
      values (v_razao, v_cnpj, v_resp, v_email, v_whats, v_cidade, v_uf)
      returning id into v_id;
    exception when unique_violation then
      raise exception 'e-mail já cadastrado';
    end;
  else
    select * into v_atual from revendedores where id = p_id for update;
    if not found then raise exception 'revendedor não encontrado'; end if;
    begin
      update revendedores set
        razao_social = v_razao, cnpj = v_cnpj, responsavel = v_resp, email = v_email,
        whatsapp = v_whats, cidade = v_cidade, uf = v_uf,
        status = case
          when v_meu = 'supervisor' and v_email <> v_atual.email and v_atual.status <> 'pendente'
            then 'pendente'::revendedor_status
          else status end,
        reviewed_at = case
          when v_meu = 'supervisor' and v_email <> v_atual.email and v_atual.status <> 'pendente'
            then null else reviewed_at end,
        reviewed_by = case
          when v_meu = 'supervisor' and v_email <> v_atual.email and v_atual.status <> 'pendente'
            then null else reviewed_by end
      where id = p_id
      returning id into v_id;
    exception when unique_violation then
      raise exception 'e-mail já cadastrado';
    end;
  end if;

  if not exists (select 1 from revendedores where id = v_id and user_id is not null) then
    select u.id into v_user
    from auth.users u
    join profiles p on p.id = u.id
    where lower(u.email) = v_email
      and u.email_confirmed_at is not null
      and not exists (select 1 from revendedores r where r.user_id = u.id)
    order by u.created_at
    limit 1;
    if v_user is not null then
      update revendedores set user_id = v_user where id = v_id;
      update profiles set papel = 'revendedor' where id = v_user and papel = 'cliente';
    end if;
  end if;

  return v_id;
end $$;

create or replace function admin_set_revendedor_status(p_id uuid, p_status revendedor_status)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  perform assert_papel(array['superadmin','admin']);
  if p_status is null then raise exception 'status inválido'; end if;
  update revendedores
     set status = p_status, reviewed_at = now(), reviewed_by = auth.uid()
   where id = p_id;
  if not found then raise exception 'revendedor não encontrado'; end if;
end $$;

-- ========== PRIVILÉGIOS ==========
-- O Supabase concede EXECUTE a anon/authenticated por padrão; revogar tudo e
-- conceder só o necessário. Nada aqui é público (anon).
revoke all on function
  public.handle_auth_user(),
  _atacado_revendedor_aprovado(),
  atacado_cart_clear_for(uuid),
  atacado_me(),
  atacado_cart_get(),
  atacado_cart_set_item(uuid, uuid, uuid, int),
  atacado_cart_remove_item(uuid),
  atacado_cart_clear(),
  atacado_my_orders(),
  admin_list_revendedores(text),
  admin_upsert_revendedor(uuid, text, text, text, text, text, text, text),
  admin_set_revendedor_status(uuid, revendedor_status)
from public, anon, authenticated;

grant execute on function
  atacado_me(),
  atacado_cart_get(),
  atacado_cart_set_item(uuid, uuid, uuid, int),
  atacado_cart_remove_item(uuid),
  atacado_cart_clear(),
  atacado_my_orders(),
  admin_list_revendedores(text),
  admin_upsert_revendedor(uuid, text, text, text, text, text, text, text),
  admin_set_revendedor_status(uuid, revendedor_status)
to authenticated;
