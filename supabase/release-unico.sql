-- release-unico.sql
-- Rodar UMA vez no SQL Editor do projeto Supabase da LOLA (uqfhbtkwnmksbtmkdcop),
-- ANTES de mergear o PR. Idempotente no passo 1; o passo 2 só troca a senha.

-- ============================================================
-- PASSO 1 — Nova senha do admin
-- Troque SUA_SENHA_NOVA_AQUI (mínimo 12 caracteres) e guarde num gerenciador de senhas.
-- ============================================================
do $$
declare v_senha text := 'SUA_SENHA_NOVA_AQUI';
begin
  if v_senha = 'SUA_SENHA_NOVA_AQUI' or length(v_senha) < 12 then
    raise exception 'Defina uma senha nova com 12+ caracteres no lugar de SUA_SENHA_NOVA_AQUI';
  end if;
  update public.admin_config
     set secret_hash = extensions.crypt(v_senha, extensions.gen_salt('bf', 10))
   where id = 1;
end $$;

-- ============================================================
-- PASSO 2 — Migração 0004 (Revendedores + destaque)
-- ============================================================
create table if not exists revendedores (
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
