-- =====================================================================
-- 0004_auth_perfis.sql — perfis (Supabase Auth), convites de papel e assert_papel
-- Substitui o antigo 0004_revendedores.sql (nunca aplicado; revendedores vão para 0006).
-- Regra central: o papel NUNCA vem de metadado do cliente. Papéis de equipe
-- (superadmin, admin, supervisor) só por convite + e-mail confirmado, ou por
-- um superadmin/admin via admin_set_user/admin_invite_user.
-- =====================================================================

set search_path = public, extensions;

-- ========== ENUM ==========
do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'papel_usuario' and n.nspname = 'public'
  ) then
    create type public.papel_usuario as enum
      ('superadmin','admin','supervisor','revendedor','cliente');
  end if;
end $$;

-- ========== TABELAS ==========
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nome text not null default '',
  papel papel_usuario not null default 'cliente',
  ativo boolean not null default true,
  ultimo_acesso timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists profiles_email_idx on profiles(email);
create index if not exists profiles_papel_idx on profiles(papel);

create table if not exists convites_papel (
  email text primary key check (email = lower(email) and email <> ''),
  papel papel_usuario not null,
  created_at timestamptz not null default now()
);

alter table profiles       enable row level security;
alter table convites_papel enable row level security;

drop policy if exists profiles_self_select on profiles;
create policy profiles_self_select on profiles
  for select to authenticated using (id = (select auth.uid()));
-- Sem policy de escrita em profiles; convites_papel sem policy alguma.

revoke all on table profiles       from anon, authenticated;
revoke all on table convites_papel from anon, authenticated;
grant select on table profiles to authenticated;

-- ========== TRIGGER EM auth.users ==========
-- Papel inicial: convite (só com e-mail confirmado) > 'revendedor' se metadado
-- tipo='revendedor' > 'cliente'. Em linha já existente o metadado é ignorado
-- (o usuário pode editá-lo a qualquer momento) e o papel só muda por convite.
-- Não rebaixa papel de equipe: convite de nível menor não reduz quem já é
-- equipe; rebaixar é só via admin_set_user (que também apaga o convite).
-- Convite é de uso único: consumido (apagado) assim que é lido com e-mail confirmado.
create or replace function public.handle_auth_user()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare
  v_email   text := lower(coalesce(new.email, ''));
  v_nome    text := coalesce(trim(new.raw_user_meta_data->>'nome'), '');
  v_convite papel_usuario;
  v_inicial papel_usuario;
begin
  if new.email_confirmed_at is not null and v_email <> '' then
    perform pg_advisory_xact_lock(hashtext('lola:profiles:papel'));
    -- Convite de equipe só vale para conta criada DEPOIS dele (anti pré-cadastro:
    -- conta anterior ao convite é promovida só por admin_set_user / bloco do dono).
    select c.papel into v_convite from convites_papel c
    where c.email = v_email
      and (c.papel not in ('superadmin','admin','supervisor')
           or new.created_at >= c.created_at);
  end if;

  v_inicial := coalesce(
    v_convite,
    case when new.raw_user_meta_data->>'tipo' = 'revendedor'
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

  return new;
end $$;

drop trigger if exists lola_on_auth_user on auth.users;
create trigger lola_on_auth_user
  after insert or update of email_confirmed_at, email on auth.users
  for each row execute function public.handle_auth_user();

-- Backfill: contas já existentes ganham perfil (sem erro se auth.users vazia).
insert into profiles (id, email, nome, papel)
select
  u.id,
  lower(coalesce(u.email, '')),
  coalesce(trim(u.raw_user_meta_data->>'nome'), ''),
  coalesce(
    case when u.email_confirmed_at is not null then c.papel end,
    case when u.raw_user_meta_data->>'tipo' = 'revendedor'
         then 'revendedor'::papel_usuario
         else 'cliente'::papel_usuario end)
from auth.users u
left join convites_papel c on c.email = lower(u.email)
on conflict (id) do nothing;

-- ========== ASSERT ==========
-- Lança 'sem permissão' se não há sessão, perfil ausente/inativo ou papel fora
-- da lista. Retorna o papel do chamador (uso: v_meu := assert_papel(array[...])).
create or replace function assert_papel(p_papeis text[])
returns text language plpgsql security definer set search_path = public, extensions as $$
declare
  v_uid   uuid := auth.uid();
  v_papel papel_usuario;
  v_ativo boolean;
begin
  if v_uid is null then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  select p.papel, p.ativo into v_papel, v_ativo from profiles p where p.id = v_uid;
  if not found or not coalesce(v_ativo, false)
     or not coalesce(v_papel::text = any(p_papeis), false) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  return v_papel::text;
end $$;

-- ========== PERFIL DO CHAMADOR ==========
create or replace function get_my_profile()
returns jsonb language plpgsql security definer set search_path = public, extensions stable as $$
begin
  return (select to_jsonb(p) from profiles p where p.id = auth.uid());
end $$;

create or replace function touch_ultimo_acesso()
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if auth.uid() is null then return; end if;
  update profiles set ultimo_acesso = now() where id = auth.uid();
end $$;

-- ========== GESTÃO DE USUÁRIOS (spec §4.4) ==========
-- Só superadmin mexe em superadmin (linha atual ou papel novo); admin gerencia
-- os demais; ninguém altera a si mesmo; sempre resta um superadmin ativo.
-- Mudanças de papel serializadas por advisory lock e o chamador é revalidado
-- depois do lock.
create or replace function admin_list_users()
returns jsonb language plpgsql security definer set search_path = public, extensions stable as $$
begin
  perform assert_papel(array['superadmin','admin']);
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', p.id, 'email', p.email, 'nome', p.nome, 'papel', p.papel,
      'ativo', p.ativo, 'ultimo_acesso', p.ultimo_acesso, 'created_at', p.created_at
    ) order by p.created_at desc)
    from profiles p
  ), '[]'::jsonb);
end $$;

create or replace function admin_set_user(p_id uuid, p_papel text, p_ativo boolean)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare
  v_meu        text;
  v_alvo       profiles;
  v_novo       papel_usuario;
  v_novo_ativo boolean;
  v_confirmado boolean;
begin
  perform assert_papel(array['superadmin','admin']);
  if p_id is null then raise exception 'usuário não encontrado'; end if;
  if p_id = auth.uid() then
    raise exception 'não é possível alterar o próprio usuário';
  end if;
  if p_papel is not null
     and not (p_papel = any(enum_range(null::papel_usuario)::text[])) then
    raise exception 'papel inválido';
  end if;

  perform pg_advisory_xact_lock(hashtext('lola:profiles:papel'));
  v_meu := assert_papel(array['superadmin','admin']);

  select * into v_alvo from profiles where id = p_id for update;
  if not found then raise exception 'usuário não encontrado'; end if;

  v_novo       := coalesce(p_papel::papel_usuario, v_alvo.papel);
  v_novo_ativo := coalesce(p_ativo, v_alvo.ativo);

  if (v_alvo.papel = 'superadmin' or v_novo = 'superadmin') and v_meu <> 'superadmin' then
    raise exception 'sem permissão' using errcode = '42501';
  end if;

  if v_novo <> v_alvo.papel and v_novo in ('superadmin','admin','supervisor') then
    select u.email_confirmed_at is not null into v_confirmado
    from auth.users u where u.id = p_id;
    if not coalesce(v_confirmado, false) then
      raise exception 'e-mail do usuário ainda não confirmado';
    end if;
  end if;

  if v_alvo.papel = 'superadmin' and v_alvo.ativo
     and (v_novo <> 'superadmin' or not v_novo_ativo)
     and not exists (
       select 1 from profiles
       where papel = 'superadmin' and ativo and id <> v_alvo.id) then
    raise exception 'é preciso manter ao menos um superadmin ativo';
  end if;

  update profiles set papel = v_novo, ativo = v_novo_ativo where id = p_id;

  -- Sem isto, uma nova confirmação/troca de e-mail reaplicaria o convite antigo.
  if v_novo <> v_alvo.papel then
    delete from convites_papel
    where email = v_alvo.email and (v_meu = 'superadmin' or papel <> 'superadmin');
  end if;
end $$;

create or replace function admin_invite_user(p_email text, p_papel text)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare
  v_meu   text;
  v_email text := lower(trim(coalesce(p_email, '')));
  v_papel papel_usuario;
  v_atual papel_usuario;
  v_aplicado boolean := false;
  r       record;
begin
  perform assert_papel(array['superadmin','admin']);
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'e-mail inválido';
  end if;
  if p_papel is null
     or not (p_papel = any(enum_range(null::papel_usuario)::text[])) then
    raise exception 'papel inválido';
  end if;
  v_papel := p_papel::papel_usuario;

  perform pg_advisory_xact_lock(hashtext('lola:profiles:papel'));
  v_meu := assert_papel(array['superadmin','admin']);

  if v_papel = 'superadmin' and v_meu <> 'superadmin' then
    raise exception 'sem permissão' using errcode = '42501';
  end if;

  select c.papel into v_atual from convites_papel c where c.email = v_email for update;
  if v_atual = 'superadmin' and v_meu <> 'superadmin' then
    raise exception 'sem permissão' using errcode = '42501';
  end if;

  for r in
    select p.id, p.papel, p.ativo, (u.email_confirmed_at is not null) as confirmado
    from profiles p
    join auth.users u on u.id = p.id
    where lower(u.email) = v_email
    for update of p
  loop
    if r.id = auth.uid() then
      raise exception 'não é possível alterar o próprio usuário';
    end if;
    if r.papel = 'superadmin' and v_meu <> 'superadmin' then
      raise exception 'sem permissão' using errcode = '42501';
    end if;
    if r.confirmado then
      if r.papel = 'superadmin' and r.ativo and v_papel <> 'superadmin'
         and not exists (
           select 1 from profiles
           where papel = 'superadmin' and ativo and id <> r.id) then
        raise exception 'é preciso manter ao menos um superadmin ativo';
      end if;
      update profiles set papel = v_papel where id = r.id;
      v_aplicado := true;
    end if;
  end loop;

  -- Convite de uso único: aplicado na hora não fica pendente.
  if v_aplicado then
    delete from convites_papel where email = v_email;
  else
    insert into convites_papel (email, papel) values (v_email, v_papel)
    on conflict (email) do update set papel = excluded.papel, created_at = now();
  end if;
end $$;

create or replace function admin_list_convites()
returns jsonb language plpgsql security definer set search_path = public, extensions stable as $$
begin
  perform assert_papel(array['superadmin','admin']);
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'email', c.email, 'papel', c.papel, 'created_at', c.created_at
    ) order by c.created_at desc)
    from convites_papel c
  ), '[]'::jsonb);
end $$;

create or replace function admin_delete_convite(p_email text)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare
  v_meu   text;
  v_email text := lower(trim(coalesce(p_email, '')));
  v_atual papel_usuario;
begin
  perform assert_papel(array['superadmin','admin']);
  perform pg_advisory_xact_lock(hashtext('lola:profiles:papel'));
  v_meu := assert_papel(array['superadmin','admin']);

  select c.papel into v_atual from convites_papel c where c.email = v_email for update;
  if not found then raise exception 'convite não encontrado'; end if;
  if v_atual = 'superadmin' and v_meu <> 'superadmin' then
    raise exception 'sem permissão' using errcode = '42501';
  end if;

  delete from convites_papel where email = v_email;
end $$;

-- ========== PRIVILÉGIOS ==========
-- O Supabase concede EXECUTE a anon/authenticated por padrão; revogar tudo e
-- conceder só o necessário. Nada aqui é público (anon).
revoke all on function
  public.handle_auth_user(),
  assert_papel(text[]),
  get_my_profile(),
  touch_ultimo_acesso(),
  admin_list_users(),
  admin_set_user(uuid, text, boolean),
  admin_invite_user(text, text),
  admin_list_convites(),
  admin_delete_convite(text)
from public, anon, authenticated;

grant execute on function
  get_my_profile(),
  touch_ultimo_acesso(),
  admin_list_users(),
  admin_set_user(uuid, text, boolean),
  admin_invite_user(text, text),
  admin_list_convites(),
  admin_delete_convite(text)
to authenticated;
