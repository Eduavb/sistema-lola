# Loja LOLA — Design Técnico

**Data:** 2026-09-09
**Status:** aprovado no brainstorming, aguardando revisão do spec
**Referência de arquitetura:** Loja Tânia (`lojatania-main`, lida como referência; não é cópia literal)

---

## 1. Contexto e objetivo

Criar do zero a base técnica de uma loja online (ecommerce) para a marca de
sapatos **LOLA**, reaproveitando a arquitetura já validada em produção na loja
Tânia, mas em **infra 100% separada**: repositório, banco Supabase e deploy
Vercel próprios. Nada de código, schema ou dados compartilhados com o projeto
antigo — a única coisa em comum é a **conta do Mercado Pago** (decisão do
cliente).

O produto final tem três blocos de funcionalidade, entregues em fases:

1. **Fase 1 — Varejo:** paridade funcional com a loja Tânia na infra nova.
2. **Fase 2 — Login de cliente (opcional):** Supabase Auth para quem quiser
   histórico de pedidos; compra como convidado continua funcionando.
3. **Fase 3 — Atacado:** área `/atacado` para revendedores, com cadastro por
   autoatendimento, aprovação manual no admin e preço de atacado por
   subcategoria.

Um único spec (este documento) cobre as três fases. O plano de implementação
será dividido em três fases correspondentes.

---

## 2. Decisões tomadas no brainstorming

| Tema | Decisão |
|---|---|
| Sequenciamento | Spec único; plano de implementação em 3 fases (varejo → login → atacado). |
| Provisionamento de infra | O cliente cria o projeto Supabase, o repositório Git e o projeto Vercel, e fornece URLs + chaves. Este projeto entrega **código + migrations SQL** (`supabase/migrations/*.sql`) para o cliente aplicar. |
| Conta Mercado Pago | **Compartilhada com a loja Tânia.** Bancos separados garantem que o painel financeiro da LOLA só mostra pedidos da LOLA. O painel do próprio Mercado Pago mistura as duas lojas. Cada loja envia seu próprio `notification_url`, então o webhook nunca confunde os pedidos. Trocar para conta própria no futuro = trocar o token. |
| Padrão de acesso ao banco | **Replicar o padrão da Tânia (A1):** RLS liberado só para leitura pública do catálogo; todo o resto via RPCs `SECURITY DEFINER`; admin manda a senha como `p_secret` em cada chamada. |
| Modelagem de revendedor | **Tabela `revendedores` própria (B1)**, `id` ligado a `auth.users`. Pedido ganha `customer_id` (nullable, Fase 2) e `revendedor_id` (nullable, Fase 3). |
| Mínimo de pedido no atacado | **12 SKUs distintos por pedido.** Cada combinação produto+cor+tamanho conta como 1 item, independentemente da quantidade daquela linha. Validado no carrinho e revalidado na RPC de checkout. |
| Pagamento no atacado | **Mesmo checkout do varejo** — Pix + cartão de crédito via Mercado Pago, pagamento na hora. |
| Carrinho de atacado | **Persistente no servidor** (tabela `carrinho_atacado`), montado aos poucos ao longo de dias, de qualquer dispositivo, com **um** pagamento único ao fechar. |
| Desconto de varejo | **Por produto** (`products.desconto_percentual`), promo pontual opcional. Só afeta o cliente final de varejo. |
| Preço de atacado | Derivado: **% de desconto de atacado por subcategoria** (`categorias.desconto_atacado_percentual`), aplicado sobre o preço de tabela. Override manual opcional por produto (`products.preco_atacado`). Atacado **nunca** acumula a promo de varejo. |
| Categorias | Tabela `categorias` gerenciável no `/admin`: estrutura de 2 níveis — **grupo** (`calcados` / `acessorios`) → **subcategoria** (nome livre: tênis, sandália, sapatilha, bolsas...). |
| Marca / domínio / identidade visual | Nome = **LOLA** (placeholder trocável). Domínio, paleta, fontes e logo definidos depois pelo cliente. Centralizados em `lib/brand.config.ts` + CSS vars em `globals.css`. |
| Taxa de entrega local | Valor fixo, editável no `/admin` sem deploy (linha em `admin_config`). |

---

## 3. Stack e estrutura do repositório

**Stack:** Next.js 16 (App Router) + TypeScript + Tailwind v4 + Supabase
(`@supabase/supabase-js`) + Vercel. Fotos de produto como **base64 (data URI)**
direto no banco. Sem ORM — acesso via cliente Supabase (query direta para
catálogo, RPC para o resto).

> **Nota Next.js 16:** o `next dev` reescreve um bloco de regras em
> `AGENTS.md`/`CLAUDE.md` e mantém docs em `node_modules/next/dist/docs/`.
> Ler o guia relevante ali antes de escrever código de rota/server action,
> porque a versão tem breaking changes em relação a versões anteriores.

```
lola/
  app/
    layout.tsx
    globals.css
    page.tsx                      vitrine
    produto/[slug]/page.tsx       PDP
    carrinho/page.tsx
    checkout/
      page.tsx
      actions.ts                  criarPedido (server action)
    pedido/[id]/page.tsx          status do pedido (retorno do MP, rastreio por link)
    minha-conta/
      page.tsx                    F1: busca por telefone; F2: + histórico logado
      actions.ts
    surpresa/page.tsx             oferta de live (noindex)
    entrar/page.tsx               F2: login/cadastro de cliente
    atacado/
      page.tsx                    F3: landing + cadastro de revendedor
      catalogo/page.tsx           F3: catálogo com preço de atacado (revendedor aprovado)
      actions.ts                  F3: server actions do atacado
    admin/
      page.tsx                    server component: checa cookie, decide login vs painel
      actions.ts                  todas as server actions do admin
    api/webhook/mercadopago/route.ts
  components/
    Header.tsx
    HeroCarousel.tsx
    TrustStrip.tsx
    ProductCard.tsx
    ProductDetail.tsx
    ProductGallery.tsx
    SurpresaOffer.tsx
    PaymentsFooter.tsx
    admin/
      AdminApp.tsx
      LoginForm.tsx
      ProductEditor.tsx
      CategoriasTab.tsx           (novo)
      PedidosTab.tsx
      SalesTab.tsx
      RevendedoresTab.tsx         (F3)
  lib/
    brand.config.ts               nome, WhatsApp, cidade da taxa, cores, logo
    supabase.ts                   client anon (via env var, NÃO hardcoded)
    mercadopago.ts                server-only
    cart.tsx                      carrinho de varejo (localStorage, client context)
    auth.tsx                      F2: sessão Supabase Auth (client context)
    types.ts                      tipos + helpers de preço/estoque/slug
  supabase/
    migrations/
      0001_fase1_schema.sql
      0002_fase1_rpcs.sql
      0003_fase1_seed_admin.sql
      0010_fase2_auth_rls.sql
      0020_fase3_revendedores.sql
      0021_fase3_rpcs.sql
      0022_fase3_carrinho_atacado.sql
  __tests__/                       Vitest (lógica pura de lib/)
```

(Numeração das migrations é indicativa; ajustar na implementação.)

---

## 4. Configuração e ambiente

### 4.1 Variáveis de ambiente (Vercel)

| Nome | Escopo | Uso |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | público | URL do projeto Supabase da LOLA |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | público | chave anon/publishable (protegida por RLS) |
| `MP_ACCESS_TOKEN` | server-only | access token de produção do Mercado Pago (conta da Tânia) |
| `NTFY_TOPIC` | server-only | tópico ntfy.sh **novo e aleatório** só da LOLA (segredo por obscuridade — nome longo, nunca reaproveitar) |
| `ADMIN_WEBHOOK_SECRET` | server-only | segredo que o webhook passa nas RPCs (`mp_register_order_payment`) sem depender do cookie do admin |

`lib/supabase.ts` lê `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
de `process.env` — **não** hardcoded como na Tânia.

`lib/mercadopago.ts` tem `import "server-only"` e lança erro claro se
`MP_ACCESS_TOKEN` não estiver configurada.

### 4.2 `lib/brand.config.ts`

Objeto único com: nome da marca (`"LOLA"`), tagline, WhatsApp de contato,
Instagram, cor primária / secundária (referência às CSS vars), caminho do logo.
As cores reais moram como CSS custom properties em `globals.css`; `brand.config`
só referencia. Trocar identidade visual = editar esses dois arquivos.

### 4.3 `admin_config` (linha única no banco)

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | `int` PK (sempre 1, `CHECK (id = 1)`) | garante linha única |
| `secret_hash` | `text` | hash da senha do admin (pgcrypto `crypt` + `gen_salt('bf')`) |
| `taxa_entrega_local` | `numeric(10,2)` | taxa fixa da entrega local (`entrega_tipo = 'entrega'`) |
| `whatsapp` | `text` | número exibido no site e usado para "frete a combinar" |
| `cidade_taxa` | `text` | nome da cidade da entrega local (ex: label "Entrega em ...") |

Editável pelas server actions do admin (aba Config).

---

## 5. Modelo de dados

### 5.1 Enums

```
order_status      : pendente | pago | preparando | enviado | pronto_retirada | entregue | retirado | cancelado
entrega_tipo      : retirada | entrega | entrega_fora
revendedor_status : pendente | aprovado | recusado
```

### 5.2 Tabelas — Fase 1

**`admin_config`** — ver §4.3.

**`categorias`**

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK default `gen_random_uuid()` | |
| `grupo` | `text` | `CHECK (grupo IN ('calcados','acessorios'))` |
| `nome` | `text` | ex: "Sandália", "Tênis", "Bolsas" |
| `slug` | `text` unique | |
| `ordem` | `int` default 0 | |
| `ativo` | `bool` default true | |
| `desconto_atacado_percentual` | `int` null | 0–100; `CHECK` de faixa; usado para derivar preço de atacado |

**`products`**

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `slug` | `text` unique null | |
| `nome` | `text` | |
| `categoria_id` | `uuid` → `categorias(id)` `ON DELETE RESTRICT` | |
| `colecao` | `text` null | |
| `preco` | `numeric(10,2)` | preço de tabela (varejo, sem promo) |
| `desconto_percentual` | `int` null | promo de **varejo** por produto (0–100) |
| `preco_atacado` | `numeric(10,2)` null | **override** manual do preço de atacado |
| `descricao` | `text` null | |
| `caracteristicas` | `text[]` default `'{}'` | |
| `ativo` | `bool` default true | |
| `destaque` | `bool` default false | |
| `ordem` | `int` default 0 | |
| `surpresa_ativo` | `bool` default false | no máximo um produto `true` por vez (garantido na RPC, não por constraint) |

**`product_colors`**

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `product_id` | `uuid` → `products(id)` `ON DELETE CASCADE` | |
| `nome` | `text` | |
| `hex` | `text` null | |
| `imagens` | `text[]` default `'{}'` | data URIs base64 |
| `ordem` | `int` default 0 | |

**`product_sizes`**

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `color_id` | `uuid` → `product_colors(id)` `ON DELETE CASCADE` | |
| `tamanho` | `text` | ex: "36", "P", "único" |
| `estoque` | `int` default 0 `CHECK (estoque >= 0)` | |

**`orders`**

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `created_at` | `timestamptz` default `now()` | |
| `status` | `order_status` default `'pendente'` | |
| `cliente_nome` | `text` | |
| `cliente_telefone` | `text` | usado no rastreio sem login |
| `entrega_tipo` | `entrega_tipo` | |
| `entrega_taxa` | `numeric(10,2)` default 0 | preenchida pela RPC |
| `endereco_rua` / `endereco_numero` / `endereco_bairro` / `endereco_complemento` / `endereco_cep` / `endereco_cidade` | `text` null | `cidade` só para `entrega_fora` |
| `valor_produtos` | `numeric(10,2)` | soma dos subtotais |
| `valor_total` | `numeric(10,2)` | `valor_produtos + entrega_taxa` |
| `mp_payment_id` | `text` null | preenchido na aprovação; usado para idempotência |
| `forma_pagamento` | `text` null | "Pix" / "Cartão de crédito" / ... |
| `is_atacado` | `bool` default false | |
| `customer_id` | `uuid` null | Fase 2 (`auth.users`) |
| `revendedor_id` | `uuid` null | Fase 3 (`revendedores`) |

**`order_items`**

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `order_id` | `uuid` → `orders(id)` `ON DELETE CASCADE` | |
| `produto_id` | `uuid` null → `products(id)` `ON DELETE SET NULL` | |
| `produto_nome` / `produto_cor` / `produto_tamanho` | `text` | snapshot no momento da compra |
| `color_id` | `uuid` null | referência para baixa de estoque |
| `size_id` | `uuid` null | referência para baixa de estoque |
| `quantidade` | `int` `CHECK (quantidade > 0)` | |
| `preco_unit` | `numeric(10,2)` | recalculado pelo servidor |
| `subtotal` | `numeric(10,2)` | `preco_unit * quantidade` |

**`sales`** — ledger achatado para o painel financeiro.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `data` | `date` default `current_date` | |
| `produto_id` | `uuid` null | |
| `produto_nome` | `text` | |
| `quantidade` | `int` | |
| `preco_unit` | `numeric(10,2)` | |
| `valor_total` | `numeric(10,2)` | |
| `forma_pagamento` | `text` null | |
| `cliente` | `text` null | |
| `origem` | `text` | `loja` \| `atacado` \| `manual` |
| `is_atacado` | `bool` default false | espelhado do pedido; usado no filtro do financeiro |
| `produto_cor` / `produto_tamanho` | `text` null | |
| `mp_payment_id` | `text` null | |
| `status` | `text` default `'aprovado'` | |
| `created_at` | `timestamptz` default `now()` | |
| `order_id` | `uuid` null | |

### 5.3 Tabelas — Fase 2

Sem tabela nova. Supabase Auth (`auth.users`) para clientes de varejo.
`orders.customer_id` já existe (§5.2).

### 5.4 Tabelas — Fase 3

**`revendedores`**

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK = `auth.users.id` | 1:1 com o usuário Auth |
| `nome` | `text` | |
| `documento` | `text` | CPF ou CNPJ (string, sem validação forte no MVP; normalizada só dígitos) |
| `telefone` | `text` | |
| `status` | `revendedor_status` default `'pendente'` | |
| `created_at` | `timestamptz` default `now()` | |
| `reviewed_at` | `timestamptz` null | |
| `reviewed_by` | `text` null | marcador do admin que revisou |

**`carrinho_atacado`** — carrinho persistente do revendedor.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `revendedor_id` | `uuid` → `revendedores(id)` `ON DELETE CASCADE` | |
| `product_id` | `uuid` → `products(id)` `ON DELETE CASCADE` | |
| `color_id` | `uuid` → `product_colors(id)` `ON DELETE CASCADE` | |
| `size_id` | `uuid` → `product_sizes(id)` `ON DELETE CASCADE` | |
| `quantidade` | `int` `CHECK (quantidade > 0)` | |
| `updated_at` | `timestamptz` default `now()` | |
| | | unique `(revendedor_id, product_id, color_id, size_id)` |

### 5.5 RLS

| Tabela | Anônimo | `authenticated` | Escrita |
|---|---|---|---|
| `categorias`, `products`, `product_colors`, `product_sizes` | `SELECT` liberado | `SELECT` liberado | só via RPC de admin |
| `orders`, `order_items` | nenhum acesso direto | **Fase 2:** `SELECT` onde `customer_id = auth.uid()` | só via RPC |
| `sales`, `admin_config` | nenhum | nenhum | só via RPC |
| `revendedores` | nenhum | `SELECT` onde `id = auth.uid()` (ver o próprio status) | insert via `atacado_signup`; update via RPC de admin |
| `carrinho_atacado` | nenhum | `SELECT` onde `revendedor_id = auth.uid()` | via RPCs `atacado_cart_*` (revalidam status aprovado) |

Todas as RPCs são `SECURITY DEFINER` com `search_path` fixo. As de admin
começam validando `p_secret` contra `admin_config.secret_hash` (função interna
`assert_admin(p_secret)` que lança exceção se não bater). As de webhook validam
`p_secret` contra `ADMIN_WEBHOOK_SECRET` (passado pelo Route Handler).

> **Divergência intencional da Tânia:** a Tânia compara a senha do admin em
> texto puro e embute a mesma string literal em três arquivos de código. Aqui
> a senha vive só no banco como hash bcrypt; o código nunca contém a senha. O
> webhook usa um segredo separado (`ADMIN_WEBHOOK_SECRET`), não a senha do
> admin.

---

## 6. Superfície de RPCs

Todas `SECURITY DEFINER`. Assinaturas são indicativas; nomes de parâmetros
seguem o padrão `p_*` da Tânia.

### 6.1 Públicas (sem secret)

| RPC | Comportamento |
|---|---|
| `checkout_iniciar_pedido(p_cliente_nome, p_cliente_telefone, p_entrega_tipo, p_endereco_rua, p_endereco_numero, p_endereco_bairro, p_endereco_complemento, p_endereco_cep, p_endereco_cidade, p_items jsonb, p_is_atacado bool, p_customer_id uuid, p_revendedor_id uuid)` | Valida itens não vazios; valida estoque de cada variação (`estoque >= quantidade`), erro `estoque insuficiente` caso contrário; **recalcula `preco_unit` server-side** (varejo: `precoVarejo`; atacado: `precoAtacado`); se `p_is_atacado`: exige `p_revendedor_id` de revendedor `aprovado` e `count(distinct SKU) >= 12`; calcula `entrega_taxa` (lê `admin_config` para `entrega`; 0 para `retirada` e `entrega_fora`); insere `orders` + `order_items`; retorna `{ id }`. **Não baixa estoque.** |
| `public_get_order(p_id uuid)` | Retorna o pedido + itens (para `/pedido/[id]` e notificação). |
| `public_lookup_orders(p_telefone text)` | Retorna pedidos daquele telefone (normalizado só dígitos), mais recentes primeiro. |
| `public_get_surpresa()` | Retorna o único produto com `surpresa_ativo = true` (com cores/tamanhos), ou nada. |

### 6.2 Webhook Mercado Pago (com `p_secret` = `ADMIN_WEBHOOK_SECRET`)

| RPC | Comportamento |
|---|---|
| `mp_register_order_payment(p_secret, p_order_id uuid, p_mp_payment_id text, p_forma_pagamento text)` | **Idempotente:** se o pedido já tem `mp_payment_id` igual, no-op. Caso contrário: seta `status = 'pago'`, grava `mp_payment_id` e `forma_pagamento`; **baixa o estoque** de cada `order_item` (`product_sizes.estoque -= quantidade`, nunca abaixo de 0); insere uma linha em `sales` por item (`origem` = `atacado` se `orders.is_atacado` senão `loja`; `is_atacado` espelhado). |

### 6.3 Admin (todas com `p_secret` = senha do admin)

| Grupo | RPCs |
|---|---|
| Auth | `admin_set_secret(p_old_secret, p_new_secret)` — valida a antiga contra o hash, grava o hash da nova. Login = qualquer `admin_*` retornando sem erro. |
| Produtos | `admin_list_products()` · `admin_upsert_product(p_id, p_nome, p_categoria_id, p_colecao, p_preco, p_desconto_percentual, p_preco_atacado, p_descricao, p_caracteristicas, p_ativo, p_destaque, p_ordem, p_slug)` · `admin_delete_product(p_id)` · `admin_set_ativo(p_id, p_ativo)` · `admin_set_desconto(p_id, p_desconto_percentual)` · `admin_set_surpresa(p_id, p_ativo)` — ao ativar num produto, desativa em todos os outros |
| Cores / tamanhos | `admin_upsert_color(p_id, p_product_id, p_nome, p_hex, p_imagens, p_ordem)` · `admin_delete_color(p_id)` · `admin_upsert_size(p_id, p_color_id, p_tamanho, p_estoque)` · `admin_delete_size(p_id)` |
| Categorias | `admin_list_categorias()` · `admin_upsert_categoria(p_id, p_grupo, p_nome, p_slug, p_ordem, p_ativo, p_desconto_atacado_percentual)` · `admin_delete_categoria(p_id)` — erro se houver produtos na categoria |
| Pedidos | `admin_list_orders(p_filtro text)` — `p_filtro` ∈ `todos` \| `varejo` \| `atacado` · `admin_update_order_status(p_id, p_status)` |
| Financeiro | `admin_list_sales(p_filtro text)` — mesmo filtro · `admin_insert_sale(p_produto_id, p_produto_nome, p_quantidade, p_preco_unit, p_valor_total, p_forma_pagamento, p_cliente, p_produto_cor, p_produto_tamanho, p_size_id, p_is_atacado)` — venda manual; se `p_size_id` informado, baixa estoque · `admin_delete_sale(p_id)` |
| Revendedores (F3) | `admin_list_revendedores(p_status text)` — filtro opcional por status · `admin_set_revendedor_status(p_id, p_status, p_reviewed_by)` — grava `reviewed_at = now()` |

### 6.4 Atacado (F3, exigem sessão Auth; validam revendedor via `auth.uid()`)

| RPC | Comportamento |
|---|---|
| `atacado_signup(p_nome, p_documento, p_telefone)` | Cria linha em `revendedores` para `auth.uid()` com `status = 'pendente'`. Erro se já existe. |
| `atacado_me()` | Retorna `{ status }` do revendedor logado (ou nada se não cadastrado). O front usa para decidir se mostra preço de atacado e libera `/atacado/catalogo`. |
| `atacado_cart_get()` | Retorna itens do `carrinho_atacado` do revendedor + snapshot de estoque atual de cada variação (para o aviso). Exige `status = 'aprovado'`. |
| `atacado_cart_set_item(p_product_id, p_color_id, p_size_id, p_quantidade)` | Upsert de uma linha (quantidade absoluta). `p_quantidade = 0` remove. Exige aprovado. |
| `atacado_cart_remove_item(p_id)` | Remove uma linha. |
| `atacado_cart_clear()` | Esvazia o carrinho (chamado após pagamento aprovado). |

---

## 7. Regras de preço

Helpers em `lib/types.ts` (espelham a lógica das RPCs; RPC é a fonte da
verdade no checkout):

```
precoVarejo(p)            = p.desconto_percentual
                             ? round(p.preco * (1 - p.desconto_percentual/100), 2)
                             : p.preco

precoAtacado(p, categoria) = p.preco_atacado != null
                             ? p.preco_atacado                                    // 1. override manual
                             : categoria.desconto_atacado_percentual != null
                               ? round(p.preco * (1 - categoria.desconto_atacado_percentual/100), 2)  // 2. % da subcategoria
                               : p.preco                                          // 3. fallback: preço de tabela
```

- O **desconto de varejo nunca entra no preço de atacado.**
- No `checkout_iniciar_pedido`, o `preco_unit` de cada item é **sempre**
  recalculado no servidor a partir do banco. O preço enviado pelo cliente é só
  conferência — divergência gera erro e o pedido não é criado.
- `/produto/[slug]` mostra `precoVarejo`. `/atacado/catalogo` mostra
  `precoAtacado`. O `ProductCard` recebe uma prop de modo (`varejo` | `atacado`)
  para escolher qual exibir.

---

## 8. Fluxos de varejo — Fase 1

### 8.1 Vitrine `/`

Server component, `revalidate = 0`. Lê catálogo por **query direta**
(`.from("products").select("*, colors:product_colors(*, sizes:product_sizes(*)), categoria:categorias(*)").eq("ativo", true).order("ordem")`).
Hero carousel (`HeroCarousel`, imagens em `/public/hero/` ou base64 de config),
faixa de confiança (`TrustStrip`), seções agrupadas por grupo → subcategoria,
grid de `ProductCard`. Produto com estoque total zero **não aparece** na
vitrine (continua no admin). Estado vazio com link para o `/admin`.

### 8.2 Produto `/produto/[slug]`

`ProductDetail` (client): galeria (`ProductGallery`, base64), seletor de cor,
seletor de numeração **apenas quando `categoria.grupo = 'calcados'`** (acessórios
não têm numeração — usam um único `product_size`, ex: "único"), aviso de estoque
baixo (`<= 3`), botão adicionar ao carrinho limitado ao estoque da variação.

### 8.3 Carrinho `/carrinho`

`lib/cart.tsx` — context client, persistência em `localStorage`. Ajuste de
quantidade por linha, limitado ao `estoque` da variação capturado na adição.
Resumo de valores. Botão para o checkout.

### 8.4 Checkout `/checkout`

Formulário: nome, telefone/WhatsApp, tipo de entrega.

| `entrega_tipo` | Campos | Taxa |
|---|---|---|
| `retirada` | nenhum endereço | 0 |
| `entrega` | rua, número, bairro (obrigatórios), complemento, CEP | `admin_config.taxa_entrega_local` (linha extra na preferência MP) |
| `entrega_fora` | cidade (obrigatória) + endereço | 0 no MP — frete combinado por WhatsApp depois |

Submit → server action `criarPedido` (`app/checkout/actions.ts`):

1. Validações de formulário.
2. `checkout_iniciar_pedido(...)` com `p_is_atacado = false`, `p_customer_id`
   (sessão, se Fase 2) e `p_revendedor_id = null`.
3. Monta itens da preferência MP a partir do carrinho (título =
   `nome - cor - tamanho`); adiciona linha "Taxa de entrega (<cidade>)" quando
   `entrega`.
4. `criarPreferencia({ itens, externalReference: JSON({ order_id }), origin, successPath: "/pedido/<id>" })`.
5. Retorna `{ url: init_point }`; o client redireciona.

`lib/mercadopago.ts` — `criarPreferencia`:
- `excluded_payment_types`: `ticket`, `atm`, `debit_card`, `prepaid_card`,
  `digital_wallet` (deixa **Pix** + **cartão de crédito**). `account_money` não
  pode ser excluído (o MP recusa a preferência inteira) — fica visível.
- `back_urls` success/failure/pending todas para `${origin}/pedido/<id>?pagamento=<resultado>`.
- `auto_return: "all"` — cliente volta à loja em qualquer resultado.
- `notification_url: ${origin}/api/webhook/mercadopago`.

### 8.5 Retorno / rastreio `/pedido/[id]`

Server component. `public_get_order(id)`. Mostra status (`ORDER_STATUS_LABEL`),
itens, entrega, valores. Lê `?pagamento=sucesso|falha|pendente` para uma
mensagem de topo. É a página de acompanhamento por link direto — o `id` do
pedido é a chave (link enviado ao cliente / retorno do MP).

### 8.6 `/minha-conta`

Fase 1: campo de telefone → `buscarPedidosPorTelefone` (server action) →
`public_lookup_orders`. Lista de pedidos com link para `/pedido/[id]`.
Fase 2 adiciona login por cima (§10).

### 8.7 `/surpresa`

Página oculta (`metadata.robots: noindex, nofollow`), `revalidate = 0`.
`public_get_surpresa()`:
- Sem produto ativo → tela "nenhuma oferta ativa" com links de Instagram /
  WhatsApp / coleção.
- Com produto → `SurpresaOffer` (client): layout de urgência ("oferta
  exclusiva da live"), seletor de cor/numeração, botão **"Comprar agora"** que
  adiciona ao carrinho e vai **direto para `/checkout`** (pula `/carrinho`).

Admin controla via toggle no `ProductEditor` / ação rápida na lista
(`admin_set_surpresa`), que garante no máximo um produto ativo.

---

## 9. Painel `/admin` — Fase 1

`app/admin/page.tsx` (server): lê cookie `lola_admin_secret`. Sem cookie →
`LoginForm` (server action `loginAdmin` valida a senha chamando
`admin_list_products`; sucesso grava cookie `httpOnly`, `secure`, `sameSite:lax`,
30 dias). Com cookie → `AdminApp` (client) com abas.

| Aba | Conteúdo |
|---|---|
| **Produtos** | Lista com ações rápidas inline: visível/oculto (`admin_set_ativo`), desconto de varejo (`admin_set_desconto`), toggle Surpresa (`admin_set_surpresa`), excluir. `ProductEditor`: nome, **subcategoria** (select de `categorias` agrupado por grupo), coleção, preço, `desconto_percentual` (varejo), `preco_atacado` (override opcional), descrição, características (lista), destaque, ordem, slug, ativo. Sub-editores de **cores** (nome, hex, upload de imagens → base64) e **tamanhos/estoque** por cor. |
| **Categorias** (nova) | CRUD de `categorias`: grupo (`calcados`/`acessorios`), nome, slug (auto de `slugify`), ordem, ativo, `desconto_atacado_percentual`. Excluir bloqueado se houver produtos na categoria. |
| **Pedidos** | Filtro **Todos / Varejo / Atacado**. Lista via `admin_list_orders(p_filtro)`. Contador reflete o filtro. Expandir mostra itens + endereço. `select` de status com opções conforme `entrega_tipo` (retirada: `pago→preparando→pronto_retirada→retirado→cancelado`; entrega: `pago→preparando→enviado→entregue→cancelado`). Marca visual de atacado + nome do revendedor quando aplicável. |
| **Financeiro** | Filtro **Todos / Varejo / Atacado**. 3 cards (total geral, este mês, nº vendas) **recalculados para o segmento**. Tabela `sales` (`admin_list_sales(p_filtro)`). Lançar venda manual (`admin_insert_sale`, com seletor Varejo/Atacado) e excluir. |
| **Revendedores** (F3) | Lista `admin_list_revendedores(p_status)`, filtro por status, botões Aprovar / Recusar (`admin_set_revendedor_status`). |
| **Config** | Trocar senha (`admin_set_secret`); editar `taxa_entrega_local`, `whatsapp`, `cidade_taxa`. |

---

## 10. Fase 2 — Login opcional de cliente (varejo)

- **Supabase Auth** (email + senha; magic link fica para depois). `app/entrar/page.tsx` (login/cadastro). `lib/auth.tsx` — context client com a sessão; `Header` mostra "Entrar" ou "Minha conta".
- **Compra como convidado inalterada.** Login só serve para histórico.
- `/checkout`: se há sessão, `criarPedido` passa `p_customer_id = auth.uid()`; senão `null`.
- `/minha-conta`: com sessão → lista pedidos de `customer_id` por **query direta** em `orders` (habilitada pela policy RLS); sem sessão → busca por telefone (Fase 1) permanece.
- **RLS:** policies de `SELECT` em `orders` e `order_items` para `authenticated` onde `customer_id = auth.uid()`. Escrita continua só por RPC.
- **Fora de escopo:** vincular pedidos antigos (feitos como convidado com o mesmo telefone) à conta nova.

---

## 11. Fase 3 — Atacado `/atacado`

### 11.1 Cadastro

`/atacado` — landing pública explicando o atacado + formulário de
autoatendimento (nome, CNPJ/CPF, telefone). Exige sessão Supabase Auth (reusa
Fase 2); ao enviar, `atacado_signup(...)` cria `revendedores` com
`status = 'pendente'`. Tela de "cadastro em análise". Enquanto `pendente` ou
`recusado`, `/atacado/catalogo` fica bloqueado (redireciona para `/atacado`
com aviso do status).

### 11.2 Catálogo de atacado

`/atacado/catalogo` — só revendedor **logado e aprovado** (checa `atacado_me()`
no server component). Mesmo layout do varejo, `ProductCard` em modo `atacado`
exibindo `precoAtacado(produto, categoria)`. Adicionar ao carrinho chama
`atacado_cart_set_item` (carrinho no servidor, não `localStorage`).

### 11.3 Carrinho de atacado (persistente)

- Tabela `carrinho_atacado` (§5.4). Montado aos poucos ao longo de dias, de
  qualquer dispositivo. RPCs `atacado_cart_*`.
- Página dedicada `/atacado/carrinho`: lista itens, ajuste de quantidade,
  contador **"X de 12 SKUs"**.
- **Aviso de estoque:** ao abrir o carrinho e no checkout, cada linha é
  reconferida contra o `estoque` atual. Se zerou ou caiu abaixo da quantidade
  no carrinho → alerta na linha ("sem estoque" / "só restam N — ajuste") e
  checkout bloqueado até resolver.
- Checkout libera só com **≥ 12 SKUs distintos**.

### 11.4 Checkout de atacado

Mesmo `/checkout` e mesma server action, com `p_is_atacado = true` e
`p_revendedor_id`. `checkout_iniciar_pedido` **revalida** no servidor:
revendedor existe e `aprovado`; recalcula todos os `preco_unit` por
`precoAtacado`; reconfere estoque; reconfere `count(distinct SKU) >= 12`.
Qualquer divergência → erro, pedido não criado.

**Pagamento:** uma única preferência MP com o carrinho inteiro (Pix + cartão).
Ao aprovar, `mp_register_order_payment` baixa o estoque de tudo de uma vez;
em seguida o webhook chama `atacado_cart_clear()` para aquele revendedor.

### 11.5 Preço de atacado ausente

Subcategoria sem `desconto_atacado_percentual` **e** produto sem
`preco_atacado` → revendedor vê o `preco` de tabela. Não quebra o checkout.

---

## 12. Webhook e notificação

`app/api/webhook/mercadopago/route.ts` — `POST` (e `GET` = `POST`, igual
Tânia):

1. Extrai `payment_id` de `data.id` / `id` na query, ou do body JSON
   (`type === "payment"`).
2. `buscarPagamento(paymentId)` no MP.
3. Se `status !== "approved"` → responde `{ ok: true }` sem efeito.
4. Faz parse de `external_reference` → `{ order_id }`.
5. `mp_register_order_payment(ADMIN_WEBHOOK_SECRET, order_id, payment.id, mapFormaPagamento(...))`
   — idempotente por `mp_payment_id`.
6. `notificarVenda(order_id)` — best-effort:
   - `public_get_order` → monta texto (cliente, valor, itens, tipo de entrega).
   - `POST https://ntfy.sh/${NTFY_TOPIC}` com headers `Title`, `Tags: moneybag`,
     `Priority: high`, `Click` para `/admin`.
   - Nunca derruba o registro da venda; erros só logados.
7. Fase 3: se `orders.is_atacado`, também `atacado_cart_clear` para o
   `revendedor_id`.

`mapFormaPagamento`: `pix → "Pix"`, `credit_card → "Cartão de crédito"`,
demais → rótulo do `payment_type_id`.

**Sem `notification_log`** (a Tânia marcou essa tabela como temporária/debug).

---

## 13. Testes

**Vitest** — lógica pura de `lib/` (`__tests__/`):

- `precoVarejo`: sem desconto, com desconto, arredondamento.
- `precoAtacado`: override manual; `%` da subcategoria; fallback sem `%`;
  garantia de que a promo de varejo não entra.
- `slugify`: acentos, espaços, símbolos, colisão de bordas.
- `totalEstoque` / `capaImagem`.
- Cálculo da taxa de entrega por `entrega_tipo`.
- Regra dos **12 SKUs distintos** (contagem por produto+cor+tamanho).
- `mapFormaPagamento`.
- Extração de `payment_id` do webhook (query com `data.id`, query com `id`,
  body JSON, corpo vazio).

**QA manual** documentado (§16) para o que depende de MP/Supabase reais.

**Fora do plano inicial:** pgTAP nas RPCs.

---

## 14. Faseamento do plano de implementação

**Fase 1 — Varejo (paridade com a Tânia na infra nova)**
Migrations `0001`–`0003`; `lib/*` (brand, supabase, mercadopago, cart, types);
vitrine, PDP, carrinho, checkout, `/pedido/[id]`, `/minha-conta` (telefone),
`/surpresa`; webhook + ntfy; `/admin` completo (Produtos, Categorias, Pedidos,
Financeiro, Config) **com** os filtros Varejo/Atacado já presentes (mostram só
varejo enquanto não há atacado); testes Vitest.

**Fase 2 — Login de cliente**
Migration `0010` (RLS); Supabase Auth; `app/entrar`; `lib/auth.tsx`;
`p_customer_id` no checkout; histórico logado em `/minha-conta`.

**Fase 3 — Atacado**
Migrations `0020`–`0022`; `/atacado` (landing + cadastro), `/atacado/catalogo`,
`/atacado/carrinho` persistente; `precoAtacado` no `ProductCard`; params de
atacado no `checkout_iniciar_pedido`; aba Revendedores no admin;
`atacado_cart_clear` no webhook.

As colunas `categorias.desconto_atacado_percentual` e `products.preco_atacado`,
e seus campos no editor de categoria / produto do `/admin`, entram já na
**Fase 1** (nullable, sem efeito até a Fase 3). Assim o cliente pode preencher
os preços de atacado antes de a área existir, e a Fase 3 só passa a
**consumi-los**.

---

## 15. Fora de escopo

- Página `/surpresa` além do comportamento descrito.
- Vincular pedido antigo (convidado, mesmo telefone) a conta nova.
- pgTAP / testes de integração com banco.
- Domínio e identidade visual definitivos (ficam em `brand.config.ts` + CSS
  vars; troca depois).
- Boleto, pagamento a prazo ou combinação por WhatsApp no atacado.
- Validação forte de CPF/CNPJ (só normalização de dígitos no MVP).
- Multi-admin com contas individuais (segue senha única, igual Tânia).

---

## 16. Checklist de QA manual por fase

**Fase 1**
- [ ] Cadastrar categoria, produto com 2 cores e numerações, imagens base64.
- [ ] Produto sem estoque some da vitrine, continua no admin.
- [ ] Checkout `retirada` sem endereço → preferência MP sem linha de taxa.
- [ ] Checkout `entrega` → linha "Taxa de entrega" com o valor de `admin_config`.
- [ ] Checkout `entrega_fora` → sem taxa no MP.
- [ ] Pagar com Pix (sandbox/produção) → volta para `/pedido/<id>?pagamento=sucesso`.
- [ ] Webhook marca `pago`, baixa estoque, cria linhas em `sales`, dispara ntfy.
- [ ] Reenvio do mesmo webhook não duplica baixa nem venda (idempotência).
- [ ] Pagamento recusado/pendente → volta para `/pedido/<id>` com status certo.
- [ ] `/minha-conta` acha pedidos por telefone.
- [ ] `/surpresa`: sem produto ativo → tela vazia; com produto → "Comprar agora" vai direto ao checkout.
- [ ] Trocar senha do admin; senha antiga deixa de funcionar.

**Fase 2**
- [ ] Compra como convidado continua funcionando sem login.
- [ ] Criar conta, comprar logado → pedido com `customer_id`.
- [ ] `/minha-conta` logado só mostra os próprios pedidos; tentativa de ler pedido de outro `customer_id` falha (RLS).

**Fase 3**
- [ ] Cadastro em `/atacado` cria revendedor `pendente`; `/atacado/catalogo` bloqueado.
- [ ] Admin aprova → catálogo libera, preços de atacado corretos (override, `%`, fallback).
- [ ] Carrinho montado em 2 sessões/dispositivos diferentes persiste.
- [ ] Checkout bloqueado abaixo de 12 SKUs; mensagem "faltam X".
- [ ] Item que zerou estoque no meio → alerta na linha, checkout bloqueado.
- [ ] Pagamento único aprovado → baixa todo o estoque, esvazia `carrinho_atacado`, venda entra no financeiro como atacado.
- [ ] Filtros Varejo/Atacado nas abas Pedidos e Financeiro segmentam corretamente.
- [ ] RPC de checkout recusa `revendedor_id` não aprovado mesmo se o front for burlado.

---

## 17. Riscos e pontos de atenção

- **Conta MP compartilhada:** o painel do Mercado Pago mistura as duas lojas;
  só a separação de bancos mantém o financeiro da LOLA limpo. Conciliação
  manual no MP fica mais trabalhosa. Reversível trocando `MP_ACCESS_TOKEN`.
- **Baixa de estoque só na aprovação:** janela de oversell entre criar o
  pedido e pagar (herdado da Tânia, aceito). `checkout_iniciar_pedido` e o
  aviso de carrinho de atacado mitigam, não eliminam.
- **Base64 no banco:** imagens infladas em ~33% e trafegam em toda leitura de
  catálogo. Aceito por decisão de projeto (igual Tânia); vigiar tamanho de
  linha e payload da vitrine.
- **Segredo do webhook:** `ADMIN_WEBHOOK_SECRET` no código do Route Handler
  via env var; se vazar, permite marcar pedidos como pagos. Manter fora do
  client bundle (Route Handler é server-only) e rotacionável.
- **`account_money` visível no checkout:** o MP não deixa excluir; cliente
  ainda pode pagar com saldo em conta MP. Sem solução — limitação da
  plataforma.
- **Next.js 16 com breaking changes:** consultar `node_modules/next/dist/docs/`
  antes de escrever rotas/server actions.
```
