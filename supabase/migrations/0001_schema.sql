create extension if not exists pgcrypto;

-- ENUMS
create type order_status as enum
  ('pendente','pago','preparando','enviado','pronto_retirada','entregue','retirado','cancelado');
create type entrega_tipo as enum ('retirada','entrega','entrega_fora');
create type revendedor_status as enum ('pendente','aprovado','recusado');

-- ADMIN CONFIG (linha única id=1)
create table admin_config (
  id int primary key default 1 check (id = 1),
  secret_hash text not null,
  taxa_entrega_local numeric(10,2) not null default 0,
  whatsapp text not null default '',
  cidade_taxa text not null default ''
);

-- CATEGORIAS
create table categorias (
  id uuid primary key default gen_random_uuid(),
  grupo text not null check (grupo in ('calcados','acessorios')),
  nome text not null,
  slug text not null unique,
  ordem int not null default 0,
  ativo boolean not null default true,
  desconto_atacado_percentual int check (desconto_atacado_percentual between 0 and 100)
);

-- PRODUCTS
create table products (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  nome text not null,
  categoria_id uuid not null references categorias(id) on delete restrict,
  colecao text,
  preco numeric(10,2) not null check (preco >= 0),
  desconto_percentual int check (desconto_percentual between 0 and 100),
  preco_atacado numeric(10,2) check (preco_atacado >= 0),
  descricao text,
  caracteristicas text[] not null default '{}',
  ativo boolean not null default true,
  destaque boolean not null default false,
  ordem int not null default 0,
  surpresa_ativo boolean not null default false
);
create index products_categoria_idx on products(categoria_id);
create index products_ativo_idx on products(ativo);

-- PRODUCT COLORS
create table product_colors (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  nome text not null,
  hex text,
  imagens text[] not null default '{}',
  ordem int not null default 0
);
create index product_colors_product_idx on product_colors(product_id);

-- PRODUCT SIZES
create table product_sizes (
  id uuid primary key default gen_random_uuid(),
  color_id uuid not null references product_colors(id) on delete cascade,
  tamanho text not null,
  estoque int not null default 0 check (estoque >= 0)
);
create index product_sizes_color_idx on product_sizes(color_id);

-- ORDERS
create table orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status order_status not null default 'pendente',
  cliente_nome text not null,
  cliente_telefone text not null,
  entrega_tipo entrega_tipo not null,
  entrega_taxa numeric(10,2) not null default 0,
  endereco_rua text, endereco_numero text, endereco_bairro text,
  endereco_complemento text, endereco_cep text, endereco_cidade text,
  valor_produtos numeric(10,2) not null default 0,
  valor_total numeric(10,2) not null default 0,
  mp_payment_id text,
  forma_pagamento text,
  is_atacado boolean not null default false,
  customer_id uuid,
  revendedor_id uuid
);
create index orders_telefone_idx on orders(cliente_telefone);
create index orders_status_idx on orders(status);
create index orders_created_idx on orders(created_at desc);

-- ORDER ITEMS
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  produto_id uuid references products(id) on delete set null,
  produto_nome text not null,
  produto_cor text,
  produto_tamanho text,
  color_id uuid,
  size_id uuid,
  quantidade int not null check (quantidade > 0),
  preco_unit numeric(10,2) not null,
  subtotal numeric(10,2) not null
);
create index order_items_order_idx on order_items(order_id);

-- SALES (ledger financeiro)
create table sales (
  id uuid primary key default gen_random_uuid(),
  data date not null default current_date,
  produto_id uuid,
  produto_nome text not null,
  quantidade int not null,
  preco_unit numeric(10,2) not null,
  valor_total numeric(10,2) not null,
  forma_pagamento text,
  cliente text,
  origem text not null default 'loja',
  is_atacado boolean not null default false,
  produto_cor text,
  produto_tamanho text,
  mp_payment_id text,
  status text not null default 'aprovado',
  created_at timestamptz not null default now(),
  order_id uuid
);
create index sales_data_idx on sales(data desc);
create index sales_atacado_idx on sales(is_atacado);

-- RLS
alter table admin_config    enable row level security;
alter table categorias      enable row level security;
alter table products        enable row level security;
alter table product_colors  enable row level security;
alter table product_sizes   enable row level security;
alter table orders          enable row level security;
alter table order_items     enable row level security;
alter table sales           enable row level security;

-- Catálogo: leitura pública (sem policy de escrita => escrita bloqueada p/ anon/auth)
create policy cat_read  on categorias     for select using (true);
create policy prod_read on products       for select using (true);
create policy col_read  on product_colors for select using (true);
create policy siz_read  on product_sizes  for select using (true);
-- orders / order_items / sales / admin_config: nenhuma policy => só SECURITY DEFINER RPC acessa
