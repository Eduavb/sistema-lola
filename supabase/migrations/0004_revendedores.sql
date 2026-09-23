-- 0004_revendedores.sql
-- Backend mínimo da aba Revendedores do admin. Sem cadastro público
-- ainda (isso é Fase 3) — só CRUD manual pelo admin por enquanto.

create table revendedores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cidade text not null,
  status revendedor_status not null default 'pendente',
  created_at timestamptz not null default now()
);
alter table revendedores enable row level security;
-- Sem policy de SELECT pública — acesso só via RPC SECURITY DEFINER.

create or replace function admin_list_revendedores(p_secret text, p_status text default 'todos')
returns jsonb language plpgsql security definer set search_path = public, extensions stable as $$
begin
  perform assert_admin(p_secret);
  return coalesce((
    select jsonb_agg(to_jsonb(r) order by
      case r.status when 'pendente' then 0 else 1 end, r.created_at desc)
    from revendedores r
    where (p_status = 'todos' or p_status is null or r.status::text = p_status)
  ), '[]'::jsonb);
end $$;

create or replace function admin_set_revendedor_status(p_secret text, p_id uuid, p_status revendedor_status)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  perform assert_admin(p_secret);
  update revendedores set status = p_status where id = p_id;
  if not found then raise exception 'revendedor não encontrado'; end if;
end $$;

create or replace function admin_upsert_revendedor(p_secret text, p_id uuid, p_nome text, p_cidade text)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid;
begin
  perform assert_admin(p_secret);
  if p_nome is null or trim(p_nome) = '' then raise exception 'nome obrigatório'; end if;
  if p_id is null then
    insert into revendedores(nome, cidade) values (trim(p_nome), coalesce(trim(p_cidade),''))
    returning id into v_id;
  else
    update revendedores set nome = trim(p_nome), cidade = coalesce(trim(p_cidade),'')
    where id = p_id returning id into v_id;
    if v_id is null then raise exception 'revendedor não encontrado'; end if;
  end if;
  return v_id;
end $$;

create or replace function admin_set_destaque(p_secret text, p_id uuid, p_destaque boolean)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  perform assert_admin(p_secret);
  update products set destaque = p_destaque where id = p_id;
end $$;
