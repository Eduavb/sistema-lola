-- =====================================================================
-- 0007_cms_textos_promos.sql — Textos da loja, Banner do hero, Promoções,
-- imagem de categoria e products.created_at (lançamentos).
-- Spec do release §3.1, §4.4, §6, §7, §8.1; regras de preço no spec-mãe §7.
-- Tabelas novas: RLS ligado e nenhuma policy (acesso só por RPC).
-- checkout_iniciar_pedido: corpo idêntico ao de 0002, exceto o preço de
-- varejo, que passa a usar _desconto_efetivo (produto x promoções vigentes).
-- =====================================================================

set search_path = public, extensions;

-- ========== TEXTOS DA LOJA ==========
create table if not exists textos_loja (
  chave text primary key,
  valor text not null
);
alter table textos_loja enable row level security;
revoke all on table textos_loja from anon, authenticated;

-- Links de Ajuda vazios = o front usa o WhatsApp da loja.
insert into textos_loja (chave, valor) values
  ('aviso.texto',               'FRETE GRÁTIS ACIMA DE R$ 299 · TROCA FÁCIL EM 30 DIAS'),
  ('aviso.ativo',               'true'),
  ('rodape.descricao',          'Calçados e acessórios.'),
  ('rodape.ajuda1_texto',       'Trocas e devoluções'),
  ('rodape.ajuda1_link',        ''),
  ('rodape.ajuda2_texto',       'Prazos de entrega'),
  ('rodape.ajuda2_link',        ''),
  ('rodape.ajuda3_texto',       'Fale com a gente'),
  ('rodape.ajuda3_link',        ''),
  ('revendedora.etiqueta',      'ATACADO LOLA'),
  ('revendedora.titulo',        'Seja revendedora LOLA.'),
  ('revendedora.texto',         'Preço de atacado a partir de 12 modelos diferentes. Cadastro com CNPJ, aprovação rápida.'),
  ('revendedora.botao',         'Quero ser revendedor'),
  ('home.categorias_titulo',    'Categorias'),
  ('home.lancamentos_etiqueta', 'ACABOU DE CHEGAR'),
  ('home.lancamentos_titulo',   'Lançamentos'),
  ('login.etiqueta',            'COLEÇÃO VERÃO 26'),
  ('login.titulo',              'Pisa confiante.')
on conflict (chave) do nothing;

create or replace function get_textos()
returns jsonb language plpgsql security definer set search_path = public, extensions stable as $$
begin
  return coalesce((select jsonb_object_agg(t.chave, t.valor) from textos_loja t), '{}'::jsonb);
end $$;

-- Só atualiza chaves já existentes; qualquer chave desconhecida aborta tudo.
create or replace function admin_set_textos(p_valores jsonb)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare
  v_chave text;
  v_json  jsonb;
  v_valor text;
begin
  perform assert_papel(array['superadmin','admin']);
  if p_valores is null or jsonb_typeof(p_valores) <> 'object' then
    raise exception 'textos inválidos';
  end if;

  for v_chave, v_json in select e.key, e.value from jsonb_each(p_valores) as e loop
    if not exists (select 1 from textos_loja where chave = v_chave) then
      raise exception 'chave de texto desconhecida: %', left(v_chave, 80);
    end if;
    if jsonb_typeof(v_json) not in ('string','boolean','number') then
      raise exception 'valor inválido para %', v_chave;
    end if;
    v_valor := v_json #>> '{}';
    if length(v_valor) > 500 then
      raise exception 'texto muito longo em % (máximo 500 caracteres)', v_chave;
    end if;
    if v_chave = 'aviso.ativo' and v_valor not in ('true','false') then
      raise exception 'aviso.ativo deve ser true ou false';
    end if;
    update textos_loja set valor = v_valor where chave = v_chave;
  end loop;
end $$;

-- ========== BANNER DO HERO ==========
-- rascunho nulo = sem alterações pendentes. Só `publicado` é público (via RPC).
create table if not exists banner_hero (
  id int primary key default 1 check (id = 1),
  rascunho jsonb,
  publicado jsonb not null,
  publicado_em timestamptz
);
alter table banner_hero enable row level security;
revoke all on table banner_hero from anon, authenticated;

insert into banner_hero (id, publicado) values (1, jsonb_build_object(
  'etiqueta',     'COLEÇÃO VERÃO 26',
  'titulo',       'Pisa confiante.',
  'subtitulo',    'Tênis, sandálias e bolsas pra quem já sabe onde quer chegar.',
  'cta1_texto',   'Ver coleção',
  'cta1_link',    '#lancamentos',
  'cta2_texto',   'Comprar por categoria',
  'cta2_mostrar', true,
  'imagem',       null))
on conflict (id) do nothing;

create or replace function get_banner_hero()
returns jsonb language plpgsql security definer set search_path = public, extensions stable as $$
begin
  return (select b.publicado from banner_hero b where b.id = 1);
end $$;

create or replace function admin_get_banner_hero()
returns jsonb language plpgsql security definer set search_path = public, extensions stable as $$
begin
  perform assert_papel(array['superadmin','admin']);
  return (select jsonb_build_object('rascunho', b.rascunho, 'publicado', b.publicado,
    'publicado_em', b.publicado_em) from banner_hero b where b.id = 1);
end $$;

-- Textos: string ou null, até 300 caracteres. cta1_link: vazio/null ou começa
-- com '/', '#' ou 'https://' (sem '//', barra invertida, espaço ou controle).
-- imagem: null ou data URL de imagem (não SVG) com até 3.000.000 caracteres.
create or replace function admin_save_banner_rascunho(p_dados jsonb)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare
  v_chave text;
  v_json  jsonb;
  v_tipo  text;
  v_valor text;
begin
  perform assert_papel(array['superadmin','admin']);
  if p_dados is null or jsonb_typeof(p_dados) <> 'object' then
    raise exception 'dados do banner inválidos';
  end if;

  for v_chave, v_json in select e.key, e.value from jsonb_each(p_dados) as e loop
    v_tipo := jsonb_typeof(v_json);
    if v_chave not in ('etiqueta','titulo','subtitulo','cta1_texto','cta1_link',
                       'cta2_texto','cta2_mostrar','imagem') then
      raise exception 'campo desconhecido no banner: %', left(v_chave, 80);
    end if;

    if v_chave = 'cta2_mostrar' then
      if v_tipo <> 'boolean' then
        raise exception 'cta2_mostrar deve ser verdadeiro ou falso';
      end if;

    elsif v_chave = 'imagem' then
      if v_tipo <> 'null' then
        v_valor := v_json #>> '{}';
        if v_tipo <> 'string'
           or left(v_valor, 11) <> 'data:image/'
           or lower(left(v_valor, 14)) = 'data:image/svg' then
          raise exception 'imagem do banner inválida';
        end if;
        if length(v_valor) > 3000000 then
          raise exception 'imagem do banner muito grande';
        end if;
      end if;

    elsif v_tipo <> 'null' then
      if v_tipo <> 'string' then
        raise exception 'valor inválido para %', v_chave;
      end if;
      v_valor := v_json #>> '{}';
      if length(v_valor) > 300 then
        raise exception 'texto muito longo em % (máximo 300 caracteres)', v_chave;
      end if;
      if v_chave = 'cta1_link' and v_valor <> '' then
        if not ((left(v_valor, 1) = '/' and left(v_valor, 2) <> '//')
                or left(v_valor, 1) = '#'
                or left(v_valor, 8) = 'https://')
           or v_valor ~ '[[:space:][:cntrl:]\\]' then
          raise exception 'link do botão deve começar com /, # ou https://';
        end if;
      end if;
    end if;
  end loop;

  update banner_hero set rascunho = p_dados where id = 1;
  if not found then raise exception 'banner não encontrado'; end if;
end $$;

-- Rascunho é mesclado sobre o publicado (campos ausentes no rascunho mantêm o valor).
create or replace function admin_publish_banner()
returns void language plpgsql security definer set search_path = public, extensions as $$
declare v_banner banner_hero;
begin
  perform assert_papel(array['superadmin','admin']);
  select * into v_banner from banner_hero where id = 1 for update;
  if not found then raise exception 'banner não encontrado'; end if;
  if v_banner.rascunho is null then
    raise exception 'não há alterações para publicar';
  end if;
  update banner_hero set publicado = v_banner.publicado || v_banner.rascunho,
    publicado_em = now(), rascunho = null
  where id = 1;
end $$;

create or replace function admin_discard_banner()
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  perform assert_papel(array['superadmin','admin']);
  update banner_hero set rascunho = null where id = 1;
end $$;

-- ========== PROMOÇÕES ==========
-- aplica_a_categoria_id nulo = loja inteira. Cupom só é armazenado (spec §3.1):
-- promoção com cupom não entra no desconto automático.
create table if not exists promocoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  desconto_percentual int not null check (desconto_percentual between 1 and 90),
  aplica_a_categoria_id uuid references categorias(id) on delete cascade,
  inicio date,
  fim date,
  cupom text,
  ativa boolean not null default true,
  created_at timestamptz default now(),
  check (fim is null or inicio is null or fim >= inicio)
);
create index if not exists promocoes_categoria_idx on promocoes(aplica_a_categoria_id);
create unique index if not exists promocoes_cupom_ativo_uniq
  on promocoes (upper(cupom)) where cupom is not null and ativa;
alter table promocoes enable row level security;
revoke all on table promocoes from anon, authenticated;

-- Regra única de vigência (usada por _desconto_efetivo e get_promocoes_ativas):
-- ativa, sem cupom, janela de datas inclui hoje em America/Fortaleza (nulos = aberto).
create or replace function _promocoes_vigentes()
returns setof promocoes language plpgsql security definer set search_path = public, extensions stable as $$
declare v_hoje date := (now() at time zone 'America/Fortaleza')::date;
begin
  return query
    select pr.* from promocoes pr
    where pr.ativa
      and pr.cupom is null
      and (pr.inicio is null or pr.inicio <= v_hoje)
      and (pr.fim is null or pr.fim >= v_hoje);
end $$;

-- Maior entre o desconto do produto e a maior promoção vigente da loja inteira
-- ou da categoria do produto; null quando nenhum.
create or replace function _desconto_efetivo(p_produto products)
returns int language plpgsql security definer set search_path = public, extensions stable as $$
declare v_promo int;
begin
  select max(pr.desconto_percentual) into v_promo
  from _promocoes_vigentes() pr
  where pr.aplica_a_categoria_id is null
     or pr.aplica_a_categoria_id = p_produto.categoria_id;
  return nullif(greatest(coalesce(p_produto.desconto_percentual, 0), coalesce(v_promo, 0)), 0);
end $$;

-- Pública: só o necessário para a vitrine calcular o preço de exibição
-- (o checkout recalcula no servidor com _desconto_efetivo).
create or replace function get_promocoes_ativas()
returns jsonb language plpgsql security definer set search_path = public, extensions stable as $$
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'desconto_percentual', pr.desconto_percentual,
      'aplica_a_categoria_id', pr.aplica_a_categoria_id)
      order by pr.desconto_percentual desc)
    from _promocoes_vigentes() pr
  ), '[]'::jsonb);
end $$;

create or replace function admin_list_promocoes()
returns jsonb language plpgsql security definer set search_path = public, extensions stable as $$
begin
  perform assert_papel(array['superadmin','admin']);
  return coalesce((
    select jsonb_agg(to_jsonb(pr) || jsonb_build_object('categoria_nome', c.nome)
      order by pr.created_at desc, pr.nome)
    from promocoes pr
    left join categorias c on c.id = pr.aplica_a_categoria_id
  ), '[]'::jsonb);
end $$;

create or replace function admin_upsert_promocao(
  p_id uuid, p_nome text, p_desconto int, p_categoria_id uuid,
  p_inicio date, p_fim date, p_cupom text, p_ativa boolean
) returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare
  v_id    uuid;
  v_nome  text := trim(coalesce(p_nome, ''));
  v_cupom text := nullif(upper(trim(coalesce(p_cupom, ''))), '');
begin
  perform assert_papel(array['superadmin','admin']);
  if v_nome = '' then raise exception 'nome da promoção é obrigatório'; end if;
  if length(v_nome) > 120 then raise exception 'nome da promoção muito longo'; end if;
  if p_desconto is null or p_desconto < 1 or p_desconto > 90 then
    raise exception 'desconto deve estar entre 1%% e 90%%';
  end if;
  if p_inicio is not null and p_fim is not null and p_fim < p_inicio then
    raise exception 'data final anterior à inicial';
  end if;
  if v_cupom is not null and v_cupom !~ '^[A-Z0-9_-]{1,40}$' then
    raise exception 'cupom inválido (use até 40 letras, números, - ou _)';
  end if;
  if p_categoria_id is not null
     and not exists (select 1 from categorias where id = p_categoria_id) then
    raise exception 'categoria não encontrada';
  end if;

  begin
    if p_id is null then
      insert into promocoes(nome, desconto_percentual, aplica_a_categoria_id, inicio, fim, cupom, ativa)
      values (v_nome, p_desconto, p_categoria_id, p_inicio, p_fim, v_cupom, coalesce(p_ativa, true))
      returning id into v_id;
    else
      update promocoes set nome = v_nome, desconto_percentual = p_desconto,
        aplica_a_categoria_id = p_categoria_id, inicio = p_inicio, fim = p_fim,
        cupom = v_cupom, ativa = coalesce(p_ativa, true)
      where id = p_id returning id into v_id;
      if v_id is null then raise exception 'registro não encontrado'; end if;
    end if;
  exception when unique_violation then
    raise exception 'cupom já usado em outra promoção ativa';
  end;
  return v_id;
end $$;

create or replace function admin_delete_promocao(p_id uuid)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  perform assert_papel(array['superadmin','admin']);
  delete from promocoes where id = p_id;
end $$;

-- ========== CATEGORIAS: IMAGEM ==========
alter table categorias add column if not exists imagem text;

-- imagem é gravada como enviada: null (ou vazio) remove a imagem.
drop function if exists admin_upsert_categoria(uuid, text, text, text, int, boolean, int);
create or replace function admin_upsert_categoria(
  p_id uuid, p_grupo text, p_nome text, p_slug text, p_ordem int,
  p_ativo boolean, p_desconto_atacado_percentual int, p_imagem text default null
) returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid; v_slug text; v_imagem text := nullif(trim(coalesce(p_imagem, '')), '');
begin
  perform assert_papel(array['superadmin','admin']);
  if v_imagem is not null and (left(v_imagem, 11) <> 'data:image/'
     or lower(left(v_imagem, 14)) = 'data:image/svg') then
    raise exception 'imagem da categoria inválida';
  end if;
  if length(v_imagem) > 1500000 then
    raise exception 'imagem da categoria muito grande';
  end if;
  v_slug := coalesce(nullif(trim(p_slug),''), _slugify(p_nome));
  if p_id is null then
    insert into categorias(grupo, nome, slug, ordem, ativo, desconto_atacado_percentual, imagem)
    values (p_grupo, p_nome, v_slug, coalesce(p_ordem,0), coalesce(p_ativo,true),
      p_desconto_atacado_percentual, v_imagem)
    returning id into v_id;
  else
    update categorias set grupo=p_grupo, nome=p_nome, slug=v_slug, ordem=coalesce(p_ordem,0),
      ativo=coalesce(p_ativo,true), desconto_atacado_percentual=p_desconto_atacado_percentual,
      imagem=v_imagem
    where id=p_id returning id into v_id;
    if v_id is null then raise exception 'registro não encontrado'; end if;
  end if;
  return v_id;
end $$;

-- ========== PRODUTOS: LANÇAMENTOS ==========
alter table products add column if not exists created_at timestamptz not null default now();
create index if not exists products_created_idx on products(created_at desc);

-- ========== _product_json ==========
-- Mesmos atributos de 0002. Acrescenta desconto_efetivo e created_at; a
-- categoria embutida sai sem `imagem` (base64 grande repetida por produto).
create or replace function _product_json(p products)
returns jsonb language sql set search_path = public stable as $$
  select jsonb_build_object(
    'id', p.id, 'slug', p.slug, 'nome', p.nome, 'categoria_id', p.categoria_id,
    'colecao', p.colecao, 'preco', p.preco, 'desconto_percentual', p.desconto_percentual,
    'desconto_efetivo', _desconto_efetivo(p), 'created_at', p.created_at,
    'preco_atacado', p.preco_atacado, 'descricao', p.descricao,
    'caracteristicas', to_jsonb(p.caracteristicas), 'ativo', p.ativo,
    'destaque', p.destaque, 'ordem', p.ordem, 'surpresa_ativo', p.surpresa_ativo,
    'categoria', (select to_jsonb(c) - 'imagem' from categorias c where c.id = p.categoria_id),
    'colors', coalesce((select jsonb_agg(jsonb_build_object(
        'id', col.id, 'product_id', col.product_id, 'nome', col.nome, 'hex', col.hex,
        'imagens', to_jsonb(col.imagens), 'ordem', col.ordem,
        'sizes', coalesce((select jsonb_agg(jsonb_build_object(
            'id', s.id, 'color_id', s.color_id, 'tamanho', s.tamanho, 'estoque', s.estoque)
            order by s.tamanho) from product_sizes s where s.color_id = col.id), '[]'::jsonb))
      order by col.ordem) from product_colors col where col.product_id = p.id), '[]'::jsonb));
$$;

-- ========== CHECKOUT ==========
-- Cópia de 0002; única mudança: o desconto do preço de varejo é o efetivo.
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

-- ========== PRIVILÉGIOS ==========
-- O Supabase concede EXECUTE a anon/authenticated por padrão. Públicas: só
-- get_textos, get_banner_hero e get_promocoes_ativas. checkout_iniciar_pedido e
-- _product_json mantêm os privilégios de 0002 (create or replace os preserva).
revoke all on function
  get_textos(),
  admin_set_textos(jsonb),
  get_banner_hero(),
  admin_get_banner_hero(),
  admin_save_banner_rascunho(jsonb),
  admin_publish_banner(),
  admin_discard_banner(),
  _promocoes_vigentes(),
  _desconto_efetivo(products),
  get_promocoes_ativas(),
  admin_list_promocoes(),
  admin_upsert_promocao(uuid, text, int, uuid, date, date, text, boolean),
  admin_delete_promocao(uuid),
  admin_upsert_categoria(uuid, text, text, text, int, boolean, int, text)
from public, anon, authenticated;

grant execute on function
  get_textos(),
  get_banner_hero(),
  get_promocoes_ativas()
to anon, authenticated;

grant execute on function
  admin_set_textos(jsonb),
  admin_get_banner_hero(),
  admin_save_banner_rascunho(jsonb),
  admin_publish_banner(),
  admin_discard_banner(),
  admin_list_promocoes(),
  admin_upsert_promocao(uuid, text, int, uuid, date, date, text, boolean),
  admin_delete_promocao(uuid),
  admin_upsert_categoria(uuid, text, text, text, int, boolean, int, text)
to authenticated;
