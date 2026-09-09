# Loja LOLA — Fase 1 (Varejo) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a loja de varejo LOLA funcional (catálogo, carrinho, checkout Mercado Pago, webhook, notificação ntfy, painel /admin) em infra nova, com paridade funcional à loja Tânia.

**Architecture:** App único Next.js 16 (App Router). Catálogo lido por query direta ao Supabase (RLS libera SELECT anônimo nas tabelas de catálogo). Todo o resto (pedidos, vendas, escrita de catálogo, config) passa por RPCs Postgres `SECURITY DEFINER`. Admin autentica por senha única (hash bcrypt em `admin_config`) guardada em cookie `httpOnly`. Checkout cria pedido via RPC, gera preferência Mercado Pago (Pix + cartão) e redireciona; o webhook do MP confirma pagamento, baixa estoque, grava venda e dispara push via ntfy.sh.

**Tech Stack:** Next.js 16, React 19, TypeScript (strict), Tailwind v4 (`@tailwindcss/postcss`), `@supabase/supabase-js` v2, `@vercel/analytics`, `server-only`, Vitest (unit de lógica pura). Deploy Vercel. Banco Supabase (Postgres + PostgREST + RPC).

**Spec:** `docs/superpowers/specs/2026-09-09-loja-lola-design.md` (ler junto com este plano)

**Referência de código:** o ZIP da loja Tânia está em `lojatania-main (1).zip` na raiz do projeto. A Task 1 o extrai para `reference/` (git-ignored). Onde um passo diz "adaptar de `reference/lojatania-main/<arquivo>`", abrir esse arquivo e aplicar as mudanças listadas — não reescrever do zero.

## Global Constraints

- **Next.js 16** — versão tem breaking changes; consultar `node_modules/next/dist/docs/` antes de escrever rotas/server actions/route handlers. Manter o bloco `<!-- BEGIN:nextjs-agent-rules -->` que o `next dev` injeta em `AGENTS.md` commitado.
- **TypeScript `strict: true`**, `noEmit`, path alias `@/* -> ./*`.
- **`next.config.ts`** deve ter `experimental.serverActions.bodySizeLimit: "4mb"` (upload de fotos base64).
- **Supabase client** lê `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` de `process.env` — **nunca** hardcoded.
- **Segredos server-only:** `MP_ACCESS_TOKEN`, `NTFY_TOPIC`, `ADMIN_WEBHOOK_SECRET`. Arquivos que os usam têm `import "server-only"` ou são Route Handlers.
- **Senha do admin:** só existe no banco como hash bcrypt (`crypt(pw, gen_salt('bf'))`); o código nunca contém a senha. Cookie: nome `lola_admin_secret`, `httpOnly`, `secure`, `sameSite: "lax"`, `path: "/"`, `maxAge` 30 dias.
- **Webhook** valida `ADMIN_WEBHOOK_SECRET` (não a senha do admin) ao chamar RPCs.
- **Mercado Pago:** `excluded_payment_types` = `ticket`, `atm`, `debit_card`, `prepaid_card`, `digital_wallet`. `auto_return: "all"`. `back_urls` success/failure/pending → `${origin}/pedido/<id>?pagamento=<resultado>`. `notification_url` → `${origin}/api/webhook/mercadopago`. `currency_id: "BRL"`.
- **Preço no checkout** é sempre recalculado no servidor (RPC). Preço vindo do cliente é só conferência.
- **Locale:** `pt-BR`, moeda `BRL` (`toLocaleString("pt-BR", { style: "currency", currency: "BRL" })`).
- **RLS:** `categorias`, `products`, `product_colors`, `product_sizes` → `SELECT` liberado para `anon` e `authenticated`; escrita revogada. `orders`, `order_items`, `sales`, `admin_config` → sem acesso direto (só RPC).
- **Marca:** nome `"LOLA"`; textos e contatos vêm de `lib/brand.config.ts`. Nenhuma string "Tânia"/"Despertar"/telefone da Tânia no código final.
- **Colunas de atacado** (`categorias.desconto_atacado_percentual`, `products.preco_atacado`) entram já nesta fase como nullable, com campos no /admin, sem efeito no checkout de varejo.
- **Commits:** um por task no mínimo; mensagens `feat:` / `test:` / `chore:` em português ou inglês, consistente. Terminar mensagens de commit com:
  `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`

---

## Estrutura de arquivos (locked)

| Arquivo | Responsabilidade |
|---|---|
| `package.json`, `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `eslint.config.mjs`, `vitest.config.ts` | scaffold |
| `.gitignore`, `.env.local.example`, `README.md` | infra/docs |
| `reference/` | ZIP da Tânia extraído (git-ignored) |
| `app/globals.css` | tokens de design (CSS vars) + classes utilitárias |
| `app/layout.tsx` | shell HTML, fontes, `CartProvider`, `Analytics` |
| `lib/brand.config.ts` | nome, contatos, textos, cores da marca |
| `lib/supabase.ts` | factory do client anon (env vars) |
| `lib/types.ts` | tipos do domínio + helpers puros (preço, estoque, slug, labels) |
| `lib/mercadopago.ts` | `criarPreferencia`, `buscarPagamento`, `mapFormaPagamento` (server-only) |
| `lib/cart.tsx` | carrinho de varejo (context + `localStorage`) |
| `supabase/migrations/0001_schema.sql` | enums, tabelas, índices, RLS |
| `supabase/migrations/0002_functions.sql` | helpers SQL + RPCs públicas + RPCs de admin + RPC de webhook |
| `supabase/migrations/0003_seed.sql` | linha única `admin_config` + senha inicial + categorias-semente |
| `components/Header.tsx`, `PaymentsFooter.tsx`, `TrustStrip.tsx`, `HeroCarousel.tsx` | chrome do site |
| `components/ProductCard.tsx`, `ProductGallery.tsx`, `ProductDetail.tsx` | catálogo |
| `components/SurpresaOffer.tsx` | página de oferta de live |
| `app/page.tsx` | vitrine |
| `app/produto/[slug]/page.tsx` | PDP |
| `app/carrinho/page.tsx` | carrinho |
| `app/checkout/page.tsx` + `app/checkout/actions.ts` | checkout + `criarPedido` |
| `app/pedido/[id]/page.tsx` | status/rastreio do pedido |
| `app/minha-conta/page.tsx` + `app/minha-conta/actions.ts` | busca de pedidos por telefone |
| `app/surpresa/page.tsx` | oferta de live |
| `app/api/webhook/mercadopago/route.ts` | confirmação de pagamento + ntfy |
| `app/admin/page.tsx` + `app/admin/actions.ts` | painel (server) + todas as server actions |
| `components/admin/LoginForm.tsx`, `AdminApp.tsx`, `ProductEditor.tsx`, `CategoriasTab.tsx`, `PedidosTab.tsx`, `SalesTab.tsx` | painel (client) |
| `__tests__/*.test.ts` | Vitest |

---

## Task 1: Scaffold do projeto

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `eslint.config.mjs`, `vitest.config.ts`, `.gitignore`, `.env.local.example`, `next-env.d.ts`
- Create: `app/layout.tsx`, `app/globals.css`, `app/page.tsx` (placeholder)
- Create: `reference/` (extração do ZIP)

**Interfaces:**
- Produces: projeto Next.js 16 que builda e roda `npm run dev`; `npm test` executa Vitest; alias `@/*`.

- [ ] **Step 1: Inicializar `git` e extrair a referência**

```bash
cd "C:/Users/VOOA/Desktop/LOLA"
git init
mkdir -p reference
unzip -q "lojatania-main (1).zip" -d reference/
```

- [ ] **Step 2: Criar `.gitignore`**

```
node_modules/
.next/
out/
.env.local
.env*.local
reference/
*.tsbuildinfo
next-env.d.ts
coverage/
```

- [ ] **Step 3: Criar `package.json`**

```json
{
  "name": "loja-lola",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.112.4",
    "@vercel/analytics": "^2.0.1",
    "next": "16.3.3",
    "react": "19.2.8",
    "react-dom": "19.2.8",
    "server-only": "^0.0.1"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.3.3",
    "tailwindcss": "^4",
    "typescript": "^5",
    "vitest": "^2"
  }
}
```

- [ ] **Step 4: Copiar configs da referência**

Copiar de `reference/lojatania-main/` **sem alterações**: `tsconfig.json`, `postcss.config.mjs`, `eslint.config.mjs`, `next-env.d.ts`.

Criar `next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
```

- [ ] **Step 5: Criar `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: { environment: "node", include: ["__tests__/**/*.test.ts"] },
});
```

- [ ] **Step 6: Criar `.env.local.example`**

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
MP_ACCESS_TOKEN=
NTFY_TOPIC=
ADMIN_WEBHOOK_SECRET=
```

- [ ] **Step 7: Criar `app/globals.css`**

Copiar `reference/lojatania-main/app/globals.css` inteiro. Nesta task fica idêntico; a Task 3 ajusta tokens de marca. (Se preferir, revisar as classes usadas ao longo do plano: `.wrap`, `.section`, `.btn`, `.btn-outline`, `.prod-grid`, `.prod-card`, `.section-title`, `.payments`, `.unica`, `.badge` etc. — todas vêm desse arquivo.)

- [ ] **Step 8: Criar `app/layout.tsx`**

Adaptar de `reference/lojatania-main/app/layout.tsx`:
- `metadata.title` → `` `${BRAND.nome} — Loja` `` importando `BRAND` de `@/lib/brand.config` (a Task 3 cria o arquivo; por ora usar string `"LOLA — Loja"` e trocar na Task 3).
- Manter `<link>` das fontes Google (Playfair Display + Montserrat), `CartProvider`, `<Analytics />`, `<html lang="pt-BR">`.

- [ ] **Step 9: Criar `app/page.tsx` placeholder**

```tsx
export default function Home() {
  return <main style={{ padding: 40 }}>LOLA — em construção</main>;
}
```

- [ ] **Step 10: Instalar e verificar**

Run: `npm install && npm run build && npm test`
Expected: build conclui; `vitest` roda com "no test files" (ok nesta task).

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js 16 + Tailwind v4 + Vitest"
```

---

## Task 2: `lib/brand.config.ts`

**Files:**
- Create: `lib/brand.config.ts`
- Modify: `app/layout.tsx` (usar `BRAND`)

**Interfaces:**
- Produces: `BRAND` — objeto `const` com `{ nome: string; tagline: string; whatsapp: string; whatsappUrl: string; instagram: string | null; instagramUrl: string | null; email: string | null }`. `whatsapp` é só dígitos com DDI (ex: `"5581999999999"`); `whatsappUrl` = `` `https://wa.me/${whatsapp}` ``.

- [ ] **Step 1: Criar `lib/brand.config.ts`**

```ts
// Identidade da marca. Trocar aqui + as CSS vars em app/globals.css
// para rebrandar sem tocar em componente.
export const BRAND = {
  nome: "LOLA",
  tagline: "Calçados e acessórios",
  // Preencher com o WhatsApp real da loja (só dígitos, com DDI 55).
  whatsapp: "5581000000000",
  get whatsappUrl() {
    return `https://wa.me/${this.whatsapp}`;
  },
  instagram: null as string | null,
  get instagramUrl() {
    return this.instagram ? `https://instagram.com/${this.instagram}` : null;
  },
  email: null as string | null,
} as const;
```

- [ ] **Step 2: Usar em `app/layout.tsx`**

Importar `BRAND` e setar `metadata.title = `${BRAND.nome} — Loja`` e `metadata.description = `${BRAND.nome} — ${BRAND.tagline}.``.

- [ ] **Step 3: Verificar**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add lib/brand.config.ts app/layout.tsx
git commit -m "feat: brand config central"
```

---

## Task 3: Tokens de design (marca LOLA)

**Files:**
- Modify: `app/globals.css` (bloco `:root`)

**Interfaces:**
- Produces: mesmas CSS vars usadas pelos componentes portados (`--bg`, `--surface`, `--line`, `--ink`, `--muted`, `--navy`, `--navy-deep`, `--navy-tint`, `--gold`, `--gold-deep`, `--font-playfair`, `--font-montserrat`). Mantidos os **nomes**; só os valores podem mudar.

- [ ] **Step 1: Ajustar `:root` em `app/globals.css`**

Manter todos os nomes de variável (os componentes dependem deles). Valores iniciais = os da Tânia (paleta neutra/navy), a serem revisados quando a identidade visual for definida. Não renomear `--navy` mesmo que a marca não use azul — é o token de "cor primária". Deixar um comentário:

```css
:root {
  /* Paleta provisória — trocar quando a identidade visual da LOLA for definida.
     NÃO renomear as variáveis; os componentes referenciam estes nomes. */
  --bg: #fbf8f2;
  --surface: #ffffff;
  --line: #e9e1d2;
  --ink: #26323d;
  --muted: #707a85;
  --navy: #12395b;        /* cor primária */
  --navy-deep: #0b2a44;
  --navy-tint: #eef2f5;
  --gold: #b08d55;        /* cor de destaque */
  --gold-deep: #8f6f3d;
  --font-playfair: "Playfair Display", serif;
  --font-montserrat: "Montserrat", -apple-system, sans-serif;
}
```

- [ ] **Step 2: Commit**

```bash
git add app/globals.css
git commit -m "chore: tokens de design provisórios da marca"
```

---

## Task 4: `lib/supabase.ts`

**Files:**
- Create: `lib/supabase.ts`

**Interfaces:**
- Produces: `supabase()` → `SupabaseClient` novo por chamada, `auth: { persistSession: false }`. `SUPABASE_URL`, `SUPABASE_ANON_KEY` exportados (lidos de env). Lança erro claro se faltarem.

- [ ] **Step 1: Criar `lib/supabase.ts`**

```ts
import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Em build/CI as envs podem faltar; só quebrar em runtime real.
  if (process.env.NODE_ENV === "production" && typeof window === "undefined") {
    console.warn("Supabase env vars ausentes — configure no painel da Vercel.");
  }
}

export function supabase() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
}
```

- [ ] **Step 2: Verificar**

Run: `npm run build`
Expected: PASS (warnings ok).

- [ ] **Step 3: Commit**

```bash
git add lib/supabase.ts
git commit -m "feat: supabase client via env vars"
```

---

## Task 5: `lib/types.ts` + helpers (TDD)

**Files:**
- Create: `lib/types.ts`
- Test: `__tests__/types.test.ts`

**Interfaces:**
- Produces:
  - Tipos: `Categoria` (`{ id; grupo: "calcados" | "acessorios"; nome; slug; ordem; ativo; desconto_atacado_percentual: number | null }`), `ProductSize`, `ProductColor`, `Product` (`{ id; slug; nome; categoria_id; categoria?: Categoria | null; colecao; preco; desconto_percentual; preco_atacado; descricao; caracteristicas: string[]; ativo; destaque; ordem; surpresa_ativo; colors: ProductColor[] }`), `OrderStatus`, `OrderItem`, `EntregaTipo`, `Order`, `Sale`.
  - `ORDER_STATUS_LABEL: Record<OrderStatus, string>`
  - `entregaTipoLabel(tipo: EntregaTipo): string`
  - `precoVarejo(p: Pick<Product,"preco"|"desconto_percentual">): number`
  - `precoAtacado(p: Pick<Product,"preco"|"preco_atacado">, categoria: Pick<Categoria,"desconto_atacado_percentual"> | null | undefined): number`
  - `totalEstoque(p: Pick<Product,"colors">): number`
  - `capaImagem(p: Pick<Product,"colors">): string | null`
  - `slugify(nome: string): string`
  - `precisaNumeracao(grupo: Categoria["grupo"] | undefined): boolean` → `grupo === "calcados"`
  - `contarSkusDistintos(items: { produtoId: string; colorId: string; sizeId: string | null }[]): number`

- [ ] **Step 1: Escrever os testes que falham** — `__tests__/types.test.ts`

```ts
import { describe, it, expect } from "vitest";
import {
  precoVarejo,
  precoAtacado,
  totalEstoque,
  capaImagem,
  slugify,
  precisaNumeracao,
  contarSkusDistintos,
  entregaTipoLabel,
} from "@/lib/types";

describe("precoVarejo", () => {
  it("sem desconto retorna o preço de tabela", () => {
    expect(precoVarejo({ preco: 199.9, desconto_percentual: null })).toBe(199.9);
  });
  it("aplica desconto percentual e arredonda a 2 casas", () => {
    expect(precoVarejo({ preco: 100, desconto_percentual: 15 })).toBe(85);
    expect(precoVarejo({ preco: 99.9, desconto_percentual: 10 })).toBe(89.91);
  });
  it("desconto 0 é tratado como sem desconto", () => {
    expect(precoVarejo({ preco: 50, desconto_percentual: 0 })).toBe(50);
  });
});

describe("precoAtacado", () => {
  it("1: usa o override do produto quando preenchido", () => {
    expect(
      precoAtacado({ preco: 100, preco_atacado: 62 }, { desconto_atacado_percentual: 30 })
    ).toBe(62);
  });
  it("2: deriva do % da subcategoria quando não há override", () => {
    expect(
      precoAtacado({ preco: 100, preco_atacado: null }, { desconto_atacado_percentual: 30 })
    ).toBe(70);
  });
  it("3: sem override e sem % da subcategoria, cai no preço de tabela", () => {
    expect(
      precoAtacado({ preco: 100, preco_atacado: null }, { desconto_atacado_percentual: null })
    ).toBe(100);
    expect(precoAtacado({ preco: 100, preco_atacado: null }, null)).toBe(100);
  });
  it("nunca aplica a promo de varejo", () => {
    // precoAtacado não recebe desconto_percentual — garante isolamento por assinatura
    expect(
      precoAtacado({ preco: 200, preco_atacado: null }, { desconto_atacado_percentual: 25 })
    ).toBe(150);
  });
});

describe("totalEstoque / capaImagem", () => {
  const p = {
    colors: [
      { imagens: [], sizes: [{ estoque: 2 }, { estoque: 0 }] },
      { imagens: ["data:img/a"], sizes: [{ estoque: 3 }] },
    ],
  } as any;
  it("soma o estoque de todas as variações", () => {
    expect(totalEstoque(p)).toBe(5);
  });
  it("pega a primeira imagem disponível", () => {
    expect(capaImagem(p)).toBe("data:img/a");
    expect(capaImagem({ colors: [] } as any)).toBeNull();
  });
});

describe("slugify", () => {
  it("normaliza acento, espaço e símbolo", () => {
    expect(slugify("Sandália Coração 2027!")).toBe("sandalia-coracao-2027");
  });
  it("remove hífens de borda", () => {
    expect(slugify("  --Tênis--  ")).toBe("tenis");
  });
});

describe("precisaNumeracao", () => {
  it("true só para calçados", () => {
    expect(precisaNumeracao("calcados")).toBe(true);
    expect(precisaNumeracao("acessorios")).toBe(false);
    expect(precisaNumeracao(undefined)).toBe(false);
  });
});

describe("contarSkusDistintos", () => {
  it("conta combinações produto+cor+tamanho únicas", () => {
    const items = [
      { produtoId: "A", colorId: "az", sizeId: "36" },
      { produtoId: "A", colorId: "az", sizeId: "37" },
      { produtoId: "A", colorId: "az", sizeId: "36" }, // repetida
      { produtoId: "B", colorId: "pr", sizeId: null },
    ];
    expect(contarSkusDistintos(items)).toBe(3);
  });
});

describe("entregaTipoLabel", () => {
  it("rotula os três tipos", () => {
    expect(entregaTipoLabel("retirada")).toMatch(/retirada/i);
    expect(entregaTipoLabel("entrega")).toMatch(/entrega/i);
    expect(entregaTipoLabel("entrega_fora")).toMatch(/fora/i);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL — `@/lib/types` não exporta essas funções.

- [ ] **Step 3: Implementar `lib/types.ts`**

Adaptar de `reference/lojatania-main/lib/types.ts`. Mudanças:
- `Categoria` deixa de ser union de string e vira o objeto descrito em Interfaces.
- `Product`: trocar `categoria: Categoria` por `categoria_id: string` + `categoria?: Categoria | null`; remover `mp_payment_link`; **manter** `desconto_percentual`, `surpresa_ativo`; adicionar `preco_atacado: number | null`.
- Renomear `precoComDesconto` → `precoVarejo` (mesma lógica).
- Adicionar `precoAtacado`, `precisaNumeracao`, `contarSkusDistintos`.
- Manter `totalEstoque`, `capaImagem`, `slugify`, `ORDER_STATUS_LABEL`, `entregaTipoLabel`, `OrderStatus`, `OrderItem`, `EntregaTipo`, `Order`, `Sale` como na referência (ajustar `Order` para incluir `cliente_telefone`, `mp_payment_id`, `forma_pagamento`, `is_atacado`, `customer_id`, `revendedor_id`; `Sale` para incluir `is_atacado`).

```ts
export function precoVarejo(p: Pick<Product, "preco" | "desconto_percentual">): number {
  if (!p.desconto_percentual) return p.preco;
  return Math.round(p.preco * (1 - p.desconto_percentual / 100) * 100) / 100;
}

export function precoAtacado(
  p: Pick<Product, "preco" | "preco_atacado">,
  categoria: Pick<Categoria, "desconto_atacado_percentual"> | null | undefined
): number {
  if (p.preco_atacado != null) return p.preco_atacado;
  const pct = categoria?.desconto_atacado_percentual;
  if (pct == null) return p.preco;
  return Math.round(p.preco * (1 - pct / 100) * 100) / 100;
}

export function precisaNumeracao(grupo: Categoria["grupo"] | undefined): boolean {
  return grupo === "calcados";
}

export function contarSkusDistintos(
  items: { produtoId: string; colorId: string; sizeId: string | null }[]
): number {
  return new Set(items.map((i) => `${i.produtoId}::${i.colorId}::${i.sizeId ?? ""}`)).size;
}
```

`slugify` — copiar exatamente da referência (usa `normalize("NFD")` + regex de combining marks).

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test`
Expected: PASS (todos os `describe`).

- [ ] **Step 5: Commit**

```bash
git add lib/types.ts __tests__/types.test.ts
git commit -m "feat: tipos do domínio + helpers de preço/estoque com testes"
```

---

## Task 6: Migration `0001_schema.sql`

**Files:**
- Create: `supabase/migrations/0001_schema.sql`

**Interfaces:**
- Produces: enums `order_status`, `entrega_tipo`, `revendedor_status`; tabelas `admin_config`, `categorias`, `products`, `product_colors`, `product_sizes`, `orders`, `order_items`, `sales` conforme spec §5.2; RLS conforme §5.5. `pgcrypto` habilitada.

- [ ] **Step 1: Escrever `supabase/migrations/0001_schema.sql`**

```sql
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
```

- [ ] **Step 2: Aplicar no Supabase**

Aplicar via Supabase MCP (`apply_migration` com name `0001_schema`) **ou** entregar o `.sql` para o cliente aplicar pelo dashboard/CLI. Registrar no PR qual caminho foi usado.

- [ ] **Step 3: Verificar**

Rodar `list_tables` (MCP) ou `\dt` no dashboard: as 8 tabelas existem; `get_advisors` (security) não acusa tabela sem RLS.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0001_schema.sql
git commit -m "feat(db): schema base fase 1 + RLS"
```

---

## Task 7: Migration `0002_functions.sql` — helpers + RPCs públicas

**Files:**
- Create: `supabase/migrations/0002_functions.sql` (parte 1 — este task adiciona o topo do arquivo; Tasks 8 e 9 acrescentam)

**Interfaces:**
- Consumes: schema da Task 6.
- Produces:
  - `assert_admin(p_secret text)` — `raise exception` se `p_secret` não bater com `admin_config.secret_hash`.
  - `_slugify(txt text) returns text`
  - `checkout_iniciar_pedido(...) returns jsonb` (`{ "id": "<uuid>" }`)
  - `public_get_order(p_id uuid) returns jsonb`
  - `public_lookup_orders(p_telefone text) returns jsonb`
  - `public_get_surpresa() returns jsonb`

- [ ] **Step 1: Escrever helpers + RPCs públicas**

```sql
-- ========== HELPERS ==========
create or replace function assert_admin(p_secret text)
returns void language plpgsql security definer set search_path = public as $$
declare ok boolean;
begin
  select (secret_hash = crypt(p_secret, secret_hash)) into ok from admin_config where id = 1;
  if not coalesce(ok, false) then
    raise exception 'não autorizado' using errcode = '28000';
  end if;
end $$;

create or replace function _slugify(txt text)
returns text language sql immutable as $$
  select trim(both '-' from regexp_replace(
    lower(translate(txt,
      'áàâãäéèêëíìîïóòôõöúùûüçñ',
      'aaaaaeeeeiiiiooooouuuucn')),
    '[^a-z0-9]+', '-', 'g'));
$$;

-- ========== PREÇO (fonte da verdade no checkout) ==========
create or replace function _preco_varejo(p_preco numeric, p_desc int)
returns numeric language sql immutable as $$
  select case when coalesce(p_desc,0) = 0 then p_preco
         else round(p_preco * (1 - p_desc/100.0), 2) end;
$$;

create or replace function _preco_atacado(p_preco numeric, p_override numeric, p_pct int)
returns numeric language sql immutable as $$
  select case
    when p_override is not null then p_override
    when p_pct is not null then round(p_preco * (1 - p_pct/100.0), 2)
    else p_preco end;
$$;

-- ========== CHECKOUT ==========
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
language plpgsql security definer set search_path = public as $$
declare
  v_order_id uuid;
  v_item jsonb;
  v_prod products;
  v_cat  categorias;
  v_size product_sizes;
  v_color product_colors;
  v_preco numeric;
  v_qtd int;
  v_prod_total numeric := 0;
  v_taxa numeric := 0;
  v_skus int := 0;
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

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qtd := (v_item->>'quantidade')::int;
    if v_qtd is null or v_qtd < 1 then raise exception 'quantidade inválida'; end if;

    select * into v_prod  from products       where id = (v_item->>'produto_id')::uuid and ativo;
    if not found then raise exception 'produto indisponível'; end if;
    select * into v_cat   from categorias     where id = v_prod.categoria_id;
    select * into v_color from product_colors where id = (v_item->>'color_id')::uuid and product_id = v_prod.id;
    if not found then raise exception 'cor indisponível'; end if;

    if v_item->>'size_id' is not null then
      select * into v_size from product_sizes where id = (v_item->>'size_id')::uuid and color_id = v_color.id
        for update;
      if not found then raise exception 'tamanho indisponível'; end if;
      if v_size.estoque < v_qtd then raise exception 'estoque insuficiente'; end if;
    end if;

    v_preco := _preco_varejo(v_prod.preco, v_prod.desconto_percentual);
    v_prod_total := v_prod_total + v_preco * v_qtd;
    v_skus := v_skus + 1;

    insert into order_items(order_id, produto_id, produto_nome, produto_cor, produto_tamanho,
      color_id, size_id, quantidade, preco_unit, subtotal)
    values (v_order_id, v_prod.id, v_prod.nome, v_color.nome,
      case when v_item->>'size_id' is not null then v_size.tamanho else null end,
      v_color.id, nullif(v_item->>'size_id','')::uuid, v_qtd, v_preco, v_preco * v_qtd);
  end loop;

  update orders set valor_produtos = v_prod_total,
                    valor_total = v_prod_total + coalesce(v_taxa,0)
  where id = v_order_id;

  return jsonb_build_object('id', v_order_id);
end $$;

-- ========== LEITURA PÚBLICA DE PEDIDO ==========
create or replace function _order_json(p_id uuid)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'id', o.id, 'created_at', o.created_at, 'status', o.status,
    'cliente_nome', o.cliente_nome, 'entrega_tipo', o.entrega_tipo,
    'entrega_taxa', o.entrega_taxa,
    'endereco_rua', o.endereco_rua, 'endereco_numero', o.endereco_numero,
    'endereco_bairro', o.endereco_bairro, 'endereco_complemento', o.endereco_complemento,
    'endereco_cep', o.endereco_cep, 'endereco_cidade', o.endereco_cidade,
    'valor_produtos', o.valor_produtos, 'valor_total', o.valor_total,
    'is_atacado', o.is_atacado,
    'items', coalesce((select jsonb_agg(jsonb_build_object(
        'id', i.id, 'produto_nome', i.produto_nome, 'produto_cor', i.produto_cor,
        'produto_tamanho', i.produto_tamanho, 'quantidade', i.quantidade,
        'preco_unit', i.preco_unit, 'subtotal', i.subtotal) order by i.produto_nome)
      from order_items i where i.order_id = o.id), '[]'::jsonb))
  from orders o where o.id = p_id;
$$;

create or replace function public_get_order(p_id uuid)
returns jsonb language sql security definer set search_path = public stable as $$
  select _order_json(p_id);
$$;

create or replace function public_lookup_orders(p_telefone text)
returns jsonb language sql security definer set search_path = public stable as $$
  select coalesce(jsonb_agg(_order_json(o.id) order by o.created_at desc), '[]'::jsonb)
  from orders o
  where o.cliente_telefone = regexp_replace(p_telefone, '\D', '', 'g')
    and regexp_replace(p_telefone, '\D', '', 'g') <> '';
$$;

-- ========== SURPRESA ==========
create or replace function _product_json(p products)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'id', p.id, 'slug', p.slug, 'nome', p.nome, 'categoria_id', p.categoria_id,
    'colecao', p.colecao, 'preco', p.preco, 'desconto_percentual', p.desconto_percentual,
    'preco_atacado', p.preco_atacado, 'descricao', p.descricao,
    'caracteristicas', to_jsonb(p.caracteristicas), 'ativo', p.ativo,
    'destaque', p.destaque, 'ordem', p.ordem, 'surpresa_ativo', p.surpresa_ativo,
    'categoria', (select to_jsonb(c) from categorias c where c.id = p.categoria_id),
    'colors', coalesce((select jsonb_agg(jsonb_build_object(
        'id', col.id, 'product_id', col.product_id, 'nome', col.nome, 'hex', col.hex,
        'imagens', to_jsonb(col.imagens), 'ordem', col.ordem,
        'sizes', coalesce((select jsonb_agg(jsonb_build_object(
            'id', s.id, 'color_id', s.color_id, 'tamanho', s.tamanho, 'estoque', s.estoque)
            order by s.tamanho) from product_sizes s where s.color_id = col.id), '[]'::jsonb))
      order by col.ordem) from product_colors col where col.product_id = p.id), '[]'::jsonb));
$$;

create or replace function public_get_surpresa()
returns jsonb language sql security definer set search_path = public stable as $$
  select _product_json(p) from products p where p.surpresa_ativo and p.ativo limit 1;
$$;
```

- [ ] **Step 2: Aplicar e testar a RPC de checkout com dados de fumaça**

Depois de aplicar, no SQL editor: inserir 1 categoria (`grupo='calcados'`), 1 produto, 1 cor, 1 tamanho com `estoque=5`; chamar `select checkout_iniciar_pedido('Teste','81999999999','retirada',null,null,null,null,null,null,'[{"produto_id":"<id>","color_id":"<id>","size_id":"<id>","quantidade":2}]'::jsonb);` → retorna `{"id": "..."}`; `select public_get_order('<id>')` traz o item com `preco_unit` recalculado e `valor_total` = 2×preço.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0002_functions.sql
git commit -m "feat(db): helpers + RPCs públicas (checkout, get_order, lookup, surpresa)"
```

---

## Task 8: `0002_functions.sql` — RPCs de admin

**Files:**
- Modify: `supabase/migrations/0002_functions.sql` (acrescentar)

**Interfaces:**
- Consumes: `assert_admin`, `_slugify`, `_product_json`, `_order_json`.
- Produces (todas `security definer`, primeiro statement `perform assert_admin(p_secret)`):
  - `admin_set_secret(p_old_secret text, p_new_secret text)`
  - `admin_list_products(p_secret text) returns jsonb`
  - `admin_upsert_product(p_secret, p_id uuid, p_nome, p_categoria_id uuid, p_colecao, p_preco numeric, p_desconto_percentual int, p_preco_atacado numeric, p_descricao, p_caracteristicas text[], p_ativo bool, p_destaque bool, p_ordem int, p_slug text) returns uuid`
  - `admin_delete_product(p_secret, p_id uuid)`
  - `admin_set_ativo(p_secret, p_id uuid, p_ativo bool)`
  - `admin_set_desconto(p_secret, p_id uuid, p_desconto_percentual int)`
  - `admin_set_surpresa(p_secret, p_id uuid, p_ativo bool)` — ao ativar, zera nos demais
  - `admin_upsert_color(p_secret, p_id uuid, p_product_id uuid, p_nome, p_hex, p_imagens text[], p_ordem int) returns uuid`
  - `admin_delete_color(p_secret, p_id uuid)`
  - `admin_upsert_size(p_secret, p_id uuid, p_color_id uuid, p_tamanho text, p_estoque int) returns uuid`
  - `admin_delete_size(p_secret, p_id uuid)`
  - `admin_list_categorias(p_secret) returns jsonb`
  - `admin_upsert_categoria(p_secret, p_id uuid, p_grupo text, p_nome text, p_slug text, p_ordem int, p_ativo bool, p_desconto_atacado_percentual int) returns uuid`
  - `admin_delete_categoria(p_secret, p_id uuid)` — erro se houver produto na categoria
  - `admin_list_orders(p_secret, p_filtro text) returns jsonb` — `p_filtro` ∈ `todos|varejo|atacado`
  - `admin_update_order_status(p_secret, p_id uuid, p_status order_status)`
  - `admin_list_sales(p_secret, p_filtro text) returns jsonb`
  - `admin_insert_sale(p_secret, p_produto_id uuid, p_produto_nome text, p_quantidade int, p_preco_unit numeric, p_valor_total numeric, p_forma_pagamento text, p_cliente text, p_produto_cor text, p_produto_tamanho text, p_size_id uuid, p_is_atacado bool)`
  - `admin_delete_sale(p_secret, p_id uuid)`
  - `admin_get_config(p_secret) returns jsonb` (`{ taxa_entrega_local, whatsapp, cidade_taxa }`)
  - `admin_set_config(p_secret, p_taxa numeric, p_whatsapp text, p_cidade text)`

- [ ] **Step 1: Escrever as RPCs de admin**

Padrão de cada função: `language plpgsql security definer set search_path = public as $$ begin perform assert_admin(p_secret); ... end $$;`. Exemplos-chave (replicar o padrão para as demais):

```sql
create or replace function admin_set_secret(p_old_secret text, p_new_secret text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform assert_admin(p_old_secret);
  if length(coalesce(p_new_secret,'')) < 8 then raise exception 'senha muito curta'; end if;
  update admin_config set secret_hash = crypt(p_new_secret, gen_salt('bf')) where id = 1;
end $$;

create or replace function admin_list_products(p_secret text)
returns jsonb language plpgsql security definer set search_path = public stable as $$
begin
  perform assert_admin(p_secret);
  return coalesce((select jsonb_agg(_product_json(p) order by p.ordem, p.nome) from products p), '[]'::jsonb);
end $$;

create or replace function admin_upsert_product(
  p_secret text, p_id uuid, p_nome text, p_categoria_id uuid, p_colecao text,
  p_preco numeric, p_desconto_percentual int, p_preco_atacado numeric, p_descricao text,
  p_caracteristicas text[], p_ativo boolean, p_destaque boolean, p_ordem int, p_slug text
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_slug text;
begin
  perform assert_admin(p_secret);
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
  end if;
  return v_id;
end $$;

create or replace function admin_set_surpresa(p_secret text, p_id uuid, p_ativo boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform assert_admin(p_secret);
  if p_ativo then update products set surpresa_ativo = (id = p_id);
  else update products set surpresa_ativo = false where id = p_id; end if;
end $$;

create or replace function admin_delete_categoria(p_secret text, p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform assert_admin(p_secret);
  if exists (select 1 from products where categoria_id = p_id) then
    raise exception 'categoria tem produtos';
  end if;
  delete from categorias where id = p_id;
end $$;

create or replace function admin_list_orders(p_secret text, p_filtro text default 'todos')
returns jsonb language plpgsql security definer set search_path = public stable as $$
begin
  perform assert_admin(p_secret);
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

create or replace function admin_update_order_status(p_secret text, p_id uuid, p_status order_status)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform assert_admin(p_secret);
  update orders set status = p_status where id = p_id;
end $$;

create or replace function admin_list_sales(p_secret text, p_filtro text default 'todos')
returns jsonb language plpgsql security definer set search_path = public stable as $$
begin
  perform assert_admin(p_secret);
  return coalesce((select jsonb_agg(to_jsonb(s) order by s.created_at desc) from sales s
    where (coalesce(p_filtro,'todos') = 'todos')
       or (p_filtro = 'varejo'  and s.is_atacado = false)
       or (p_filtro = 'atacado' and s.is_atacado = true)), '[]'::jsonb);
end $$;

create or replace function admin_insert_sale(
  p_secret text, p_produto_id uuid, p_produto_nome text, p_quantidade int, p_preco_unit numeric,
  p_valor_total numeric, p_forma_pagamento text, p_cliente text, p_produto_cor text,
  p_produto_tamanho text, p_size_id uuid, p_is_atacado boolean
) returns void language plpgsql security definer set search_path = public as $$
begin
  perform assert_admin(p_secret);
  insert into sales(produto_id,produto_nome,quantidade,preco_unit,valor_total,forma_pagamento,
    cliente,origem,is_atacado,produto_cor,produto_tamanho,status)
  values (p_produto_id,p_produto_nome,p_quantidade,p_preco_unit,p_valor_total,p_forma_pagamento,
    p_cliente,'manual',coalesce(p_is_atacado,false),p_produto_cor,p_produto_tamanho,'aprovado');
  if p_size_id is not null then
    update product_sizes set estoque = greatest(0, estoque - p_quantidade) where id = p_size_id;
  end if;
end $$;

create or replace function admin_get_config(p_secret text)
returns jsonb language plpgsql security definer set search_path = public stable as $$
begin
  perform assert_admin(p_secret);
  return (select jsonb_build_object('taxa_entrega_local', taxa_entrega_local,
    'whatsapp', whatsapp, 'cidade_taxa', cidade_taxa) from admin_config where id = 1);
end $$;

create or replace function admin_set_config(p_secret text, p_taxa numeric, p_whatsapp text, p_cidade text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform assert_admin(p_secret);
  update admin_config set taxa_entrega_local = coalesce(p_taxa,0),
    whatsapp = coalesce(p_whatsapp,''), cidade_taxa = coalesce(p_cidade,'') where id = 1;
end $$;
```

Escrever também, seguindo o mesmo padrão: `admin_delete_product`, `admin_set_ativo`, `admin_set_desconto` (`update products set desconto_percentual = nullif(p_desconto_percentual,0)`), `admin_upsert_color`, `admin_delete_color`, `admin_upsert_size`, `admin_delete_size`, `admin_list_categorias` (`jsonb_agg(to_jsonb(c) order by c.grupo, c.ordem, c.nome)`), `admin_upsert_categoria` (slug via `_slugify` se vazio; `desconto_atacado_percentual = nullif(p_...,0)`... na verdade manter valor mesmo 0 → usar `p_desconto_atacado_percentual` direto, permitindo `null`), `admin_delete_sale`.

- [ ] **Step 2: Aplicar**

Aplicar a migration atualizada (`0002_functions`). Se o alvo já tem a v1 da Task 7, aplicar só o bloco novo como `0002b_admin_functions.sql` para manter histórico limpo — decidir conforme o método de aplicação (MCP `apply_migration` aceita re-run de `create or replace`).

- [ ] **Step 3: Smoke test**

`select admin_list_products('senha-errada')` → erro `não autorizado`. (A senha certa é semeada na Task 9; reordenar se necessário para testar aqui.)

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(db): RPCs de admin (produtos, categorias, pedidos, financeiro, config)"
```

---

## Task 9: `0002_functions.sql` — RPC de webhook + `0003_seed.sql`

**Files:**
- Modify: `supabase/migrations/0002_functions.sql`
- Create: `supabase/migrations/0003_seed.sql`

**Interfaces:**
- Consumes: schema + helpers.
- Produces:
  - `mp_register_order_payment(p_secret text, p_order_id uuid, p_mp_payment_id text, p_forma_pagamento text) returns jsonb` — valida `p_secret` contra um segredo dedicado guardado em `admin_config`? **Não**: o webhook passa `ADMIN_WEBHOOK_SECRET` da env; a RPC compara com `current_setting`? Simplest: a RPC compara `p_secret` com o hash do admin **ou** com um valor fixo. Decisão: reutilizar `assert_admin` **não** serve (senha do admin muda). Guardar `webhook_secret_hash` em `admin_config`.
  - Portanto: adicionar coluna `webhook_secret_hash text` em `admin_config` (nesta migration via `alter table`), `assert_webhook(p_secret)` análogo a `assert_admin`.
- `0003_seed.sql`: `insert into admin_config` (linha 1) com `secret_hash` e `webhook_secret_hash` de senhas geradas; categorias-semente.

- [ ] **Step 1: Adicionar coluna + `assert_webhook` + RPC de pagamento**

```sql
alter table admin_config add column if not exists webhook_secret_hash text not null default '';

create or replace function assert_webhook(p_secret text)
returns void language plpgsql security definer set search_path = public as $$
declare ok boolean;
begin
  select (webhook_secret_hash <> '' and webhook_secret_hash = crypt(p_secret, webhook_secret_hash))
    into ok from admin_config where id = 1;
  if not coalesce(ok,false) then raise exception 'não autorizado' using errcode='28000'; end if;
end $$;

create or replace function mp_register_order_payment(
  p_secret text, p_order_id uuid, p_mp_payment_id text, p_forma_pagamento text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_ord orders; v_it order_items;
begin
  perform assert_webhook(p_secret);
  select * into v_ord from orders where id = p_order_id for update;
  if not found then raise exception 'pedido não encontrado'; end if;

  -- idempotência: mesmo pagamento já registrado => no-op
  if v_ord.mp_payment_id is not null and v_ord.mp_payment_id = p_mp_payment_id then
    return jsonb_build_object('ok', true, 'already', true);
  end if;

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

  return jsonb_build_object('ok', true);
end $$;
```

- [ ] **Step 2: Escrever `0003_seed.sql`**

Gerar duas senhas fortes (ex: `openssl rand -base64 18`). Substituir os literais abaixo pelas geradas e **entregar ao cliente** (admin) / **configurar na env** (webhook):

```sql
insert into admin_config (id, secret_hash, webhook_secret_hash, taxa_entrega_local, whatsapp, cidade_taxa)
values (
  1,
  crypt('<SENHA_ADMIN_GERADA>', gen_salt('bf')),
  crypt('<ADMIN_WEBHOOK_SECRET_GERADO>', gen_salt('bf')),
  0, '', ''
)
on conflict (id) do nothing;

insert into categorias (grupo, nome, slug, ordem) values
  ('calcados','Tênis','tenis',1),
  ('calcados','Sandália','sandalia',2),
  ('calcados','Sapatilha','sapatilha',3),
  ('acessorios','Bolsas','bolsas',10)
on conflict (slug) do nothing;
```

- [ ] **Step 3: Aplicar tudo e validar ponta a ponta no SQL**

- `select assert_webhook('<ADMIN_WEBHOOK_SECRET_GERADO>')` → sem erro; com valor errado → erro.
- Criar pedido de fumaça (Task 7 Step 2), depois `select mp_register_order_payment('<webhook>','<order_id>','PAY123','Pix')` → estoque do tamanho baixa, `sales` ganha linha, `orders.status='pago'`. Rodar de novo com `'PAY123'` → `{"ok":true,"already":true}`, sem baixar estoque de novo.

- [ ] **Step 4: Registrar segredos**

Anexar ao PR (ou canal combinado com o cliente): senha do `/admin` e `ADMIN_WEBHOOK_SECRET`. `ADMIN_WEBHOOK_SECRET` vai como env var na Vercel.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(db): RPC de pagamento (webhook) + seed de config e categorias"
```

---

## Task 10: `lib/mercadopago.ts` (TDD no que é puro)

**Files:**
- Create: `lib/mercadopago.ts`
- Test: `__tests__/mercadopago.test.ts`

**Interfaces:**
- Consumes: `MP_ACCESS_TOKEN` (env).
- Produces:
  - `type ItemPreferencia = { titulo: string; quantidade: number; precoUnitario: number }`
  - `type CriarPreferenciaInput = { itens: ItemPreferencia[]; externalReference: string; origin: string; successPath?: string }`
  - `criarPreferencia(input): Promise<{ id: string; init_point: string; sandbox_init_point: string }>`
  - `buscarPagamento(paymentId: string): Promise<{ id: number; status: string; external_reference: string | null; transaction_amount: number; payment_method_id: string | null; payment_type_id: string | null }>`
  - `mapFormaPagamento(paymentMethodId: string | null, paymentTypeId: string | null): string`
  - `montarBackUrls(origin: string, successPath: string): { success: string; failure: string; pending: string }` (exportada p/ teste)

- [ ] **Step 1: Testes que falham** — `__tests__/mercadopago.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { mapFormaPagamento, montarBackUrls } from "@/lib/mercadopago";

describe("mapFormaPagamento", () => {
  it("pix", () => expect(mapFormaPagamento("pix", "bank_transfer")).toBe("Pix"));
  it("cartão de crédito", () =>
    expect(mapFormaPagamento("visa", "credit_card")).toBe("Cartão de crédito"));
  it("fallback usa o payment_type_id", () =>
    expect(mapFormaPagamento(null, "account_money")).toBe("account_money"));
  it("fallback final", () => expect(mapFormaPagamento(null, null)).toBe("Mercado Pago"));
});

describe("montarBackUrls", () => {
  it("aponta os três resultados para /pedido/<id>", () => {
    const u = montarBackUrls("https://lola.com", "/pedido/abc");
    expect(u.success).toBe("https://lola.com/pedido/abc?pagamento=sucesso");
    expect(u.failure).toBe("https://lola.com/pedido/abc?pagamento=falha");
    expect(u.pending).toBe("https://lola.com/pedido/abc?pagamento=pendente");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL — módulo não exporta essas funções.

- [ ] **Step 3: Implementar**

Adaptar de `reference/lojatania-main/lib/mercadopago.ts`. Manter `import "server-only"`, `getAccessToken()`, `MP_API`, `criarPreferencia` (com o bloco `excluded_payment_types`, `auto_return: "all"`, `notification_url`), `buscarPagamento`. Extrair `montarBackUrls` e adicionar `mapFormaPagamento` (mover a lógica que na Tânia está no route handler):

```ts
export function montarBackUrls(origin: string, successPath: string) {
  return {
    success: `${origin}${successPath}?pagamento=sucesso`,
    failure: `${origin}${successPath}?pagamento=falha`,
    pending: `${origin}${successPath}?pagamento=pendente`,
  };
}

export function mapFormaPagamento(paymentMethodId: string | null, paymentTypeId: string | null): string {
  if (paymentMethodId === "pix") return "Pix";
  if (paymentTypeId === "credit_card") return "Cartão de crédito";
  return paymentTypeId ?? "Mercado Pago";
}
```

Em `criarPreferencia`, usar `montarBackUrls(input.origin, input.successPath ?? "/")`.

> `import "server-only"` faz o Vitest (ambiente node) quebrar? Não — `server-only` só lança em bundle de client. Se quebrar no teste, mover `mapFormaPagamento`/`montarBackUrls` para um `lib/mercadopago-utils.ts` sem `server-only` e reexportar. Preferir manter num arquivo só; só dividir se o teste acusar.

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/mercadopago.ts __tests__/mercadopago.test.ts
git commit -m "feat: cliente Mercado Pago (preferência, pagamento, mapeamentos)"
```

---

## Task 11: `lib/cart.tsx`

**Files:**
- Create: `lib/cart.tsx`
- Test: `__tests__/cart-helpers.test.ts`

**Interfaces:**
- Produces: `CartProvider`, `useCart()` → `{ items: CartItem[]; addItem; removeItem; setQuantidade; clear; totalItens: number; totalValor: number; hydrated: boolean }`. `CartItem` = campo `key` (`produtoId::colorId::sizeId`) + `{ produtoId; colorId; sizeId: string|null; nome; corNome: string|null; tamanho: string|null; precoUnit: number; imagem: string|null; quantidade: number; maxEstoque: number|null }`. Exportar helper puro `makeCartKey(produtoId, colorId, sizeId)` e `calcTotais(items)`.

- [ ] **Step 1: Teste que falha** — `__tests__/cart-helpers.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { makeCartKey, calcTotais } from "@/lib/cart";

describe("makeCartKey", () => {
  it("compõe produto+cor+tamanho e trata size nulo", () => {
    expect(makeCartKey("p", "c", "36")).toBe("p::c::36");
    expect(makeCartKey("p", "c", null)).toBe("p::c::");
  });
});

describe("calcTotais", () => {
  it("soma quantidade e valor", () => {
    const r = calcTotais([
      { quantidade: 2, precoUnit: 50 } as any,
      { quantidade: 1, precoUnit: 30 } as any,
    ]);
    expect(r.totalItens).toBe(3);
    expect(r.totalValor).toBe(130);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar** — `npm test` → FAIL.

- [ ] **Step 3: Implementar**

Adaptar de `reference/lojatania-main/lib/cart.tsx`. Mudanças:
- `STORAGE_KEY` → `"lola_cart_v1"`.
- Exportar `makeCartKey` (renomear `makeKey`) e `calcTotais(items)` (extrair o cálculo dos dois `useMemo`).
- Resto idêntico (context, hydration guard, try/catch em `localStorage`).

- [ ] **Step 4: Rodar e ver passar** — `npm test` → PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/cart.tsx __tests__/cart-helpers.test.ts
git commit -m "feat: carrinho de varejo (context + localStorage)"
```

---

## Task 12: Chrome do site — `Header`, `PaymentsFooter`, `TrustStrip`

**Files:**
- Create: `components/Header.tsx`, `components/PaymentsFooter.tsx`, `components/TrustStrip.tsx`

**Interfaces:**
- Consumes: `useCart` (Header), `BRAND`.
- Produces: `<Header />`, `PaymentsStrip`, `SiteFooter`, `<TrustStrip />`.

- [ ] **Step 1: `components/PaymentsFooter.tsx`**

Adaptar da referência. Trocar: logo `src` → `BRAND` não tem logo ainda → usar texto `{BRAND.nome}` num `<span>` estilizado (`fontFamily: var(--font-playfair)`); textos "Loja Tânia..." → `` `${BRAND.nome} — ${BRAND.tagline}.` ``; links WhatsApp/Instagram → `BRAND.whatsappUrl` / `BRAND.instagramUrl` (esconder o `<li>` do Instagram se `null`); `© 2027 Loja Tânia` → `` `© ${new Date().getFullYear()} ${BRAND.nome}` ``; remover menção "Coleção Despertar". Manter classes e estrutura.

- [ ] **Step 2: `components/TrustStrip.tsx`**

Adaptar da referência. Trocar os textos `t1/t2` para neutros da marca (ex: "LOLA", "Calçados e acessórios" / "Pix ou cartão", "Pagamento pelo Mercado Pago" / "Compra segura", "Checkout oficial Mercado Pago" / "Atendimento", "Fale com a gente no WhatsApp" com `href: BRAND.whatsappUrl`). Manter ícones/layout.

- [ ] **Step 3: `components/Header.tsx`**

Adaptar da referência. Mudanças:
- `NAV_LINKS` → derivar de grupos/categorias fixos por ora: `[{href:"/#calcados",label:"Calçados"},{href:"/#acessorios",label:"Acessórios"},{href:"/minha-conta",label:"Minha conta"}]`.
- Faixa superior: `"Coleção Despertar — Verão 2027"` → `BRAND.tagline`.
- Logo `<img src="/logo/tania-logo.png">` → `<span>` com `{BRAND.nome}` (Playfair, `letter-spacing`). Deixar `TODO` comentado para trocar por `<img>` quando a logo existir.
- Manter menu mobile, badge do carrinho (`totalItens`), ícone de busca (pode ficar decorativo/sem ação nesta fase).

- [ ] **Step 4: Verificar** — `npm run build` → PASS. `npm run lint` → sem erros novos.

- [ ] **Step 5: Commit**

```bash
git add components/Header.tsx components/PaymentsFooter.tsx components/TrustStrip.tsx
git commit -m "feat: header, footer e trust strip da marca"
```

---

## Task 13: `HeroCarousel` + `ProductCard`

**Files:**
- Create: `components/HeroCarousel.tsx`, `components/ProductCard.tsx`

**Interfaces:**
- Consumes: `Product`, `precoVarejo`, `precoAtacado` (não usado aqui ainda), `Categoria`.
- Produces:
  - `<HeroCarousel slides={HeroSlide[]} />` — `HeroSlide` como na referência.
  - `<ProductCard product={Product} modo?: "varejo" | "atacado" />` — default `"varejo"`.

- [ ] **Step 1: `components/HeroCarousel.tsx`**

Copiar da referência **sem mudança de lógica**. É agnóstico de marca (recebe `slides` por prop).

- [ ] **Step 2: `components/ProductCard.tsx`**

Adaptar da referência. Mudanças:
- Prop nova `modo: "varejo" | "atacado" = "varejo"`.
- `precoComDesconto` → `precoVarejo`. Quando `modo === "atacado"`: preço exibido = `precoAtacado(product, product.categoria)`, **sem** o preço riscado (atacado não tem promo).
- Rótulo de categoria: `product.categoria?.nome ?? ""` (era hardcoded "Bolsa"/"Sandália").
- "Confira os tamanhos" só quando `precisaNumeracao(product.categoria?.grupo)`.
- Manter swatches de cor, badge de destaque, `href` por slug.

- [ ] **Step 3: Verificar** — `npm run build` → PASS.

- [ ] **Step 4: Commit**

```bash
git add components/HeroCarousel.tsx components/ProductCard.tsx
git commit -m "feat: hero carousel e product card"
```

---

## Task 14: Vitrine `app/page.tsx`

**Files:**
- Create/Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `supabase()`, `Product`, `totalEstoque`, `Header`, `HeroCarousel`, `TrustStrip`, `ProductCard`, `PaymentsStrip`, `SiteFooter`.
- Produces: página `/` (`revalidate = 0`).

- [ ] **Step 1: Implementar `app/page.tsx`**

Adaptar de `reference/lojatania-main/app/page.tsx`. Mudanças:
- `getProducts`: `select("*, categoria:categorias(*), colors:product_colors(*, sizes:product_sizes(*))")`, `.eq("ativo", true)`, `.order("ordem")`. Ordenar `colors`/`sizes` no cliente se o PostgREST não garantir.
- Filtro de vitrine: `products.filter(p => totalEstoque(p) > 0)`.
- Agrupar por **grupo** e dentro por **categoria** (via `p.categoria`). Renderizar uma `<section id="calcados">` e uma `<section id="acessorios">`, cada uma com subtítulos por categoria e `prod-grid` de `ProductCard`. Manter a seção "Destaques" (produtos com `destaque = true`, máx 4) no topo.
- Trocar todos os textos "Despertar"/"coleção" por textos neutros (`BRAND`). Hero `slides`: usar placeholders (`src: null`, `placeholderLabel: "Banner LOLA"`) até haver imagens reais — a Tânia usa arquivos em `/public/hero/`; aqui começar sem eles.
- `EmptyGrid` aponta para `/admin`.

- [ ] **Step 2: Verificar (com banco)**

Run: `npm run dev`. Com as categorias-semente e ao menos 1 produto ativo com estoque cadastrado (inserir via SQL ou aguardar Task 18), `/` renderiza sem erro. Sem produtos: mostra estados vazios.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: vitrine com agrupamento por grupo/categoria"
```

---

## Task 15: PDP — `ProductGallery`, `ProductDetail`, `app/produto/[slug]/page.tsx`

**Files:**
- Create: `components/ProductGallery.tsx`, `components/ProductDetail.tsx`, `app/produto/[slug]/page.tsx`

**Interfaces:**
- Consumes: `supabase()`, `Product`, `precoVarejo`, `precisaNumeracao`, `useCart`.
- Produces: `<ProductGallery images={string[]} alt={string} />`, `<ProductDetail product={Product} />`, rota `/produto/[slug]`.

- [ ] **Step 1: `components/ProductGallery.tsx`**

Copiar da referência (`reference/lojatania-main/components/ProductGallery.tsx`) sem mudança — é genérico (recebe `images`, `alt`).

- [ ] **Step 2: `components/ProductDetail.tsx`**

Adaptar de `reference/lojatania-main/components/ProductDetail.tsx`. Mudanças:
- `precoComDesconto` → `precoVarejo`.
- `precisaTamanho = precisaNumeracao(product.categoria?.grupo)` (era `product.categoria === "sandalia"`).
- Rótulos de categoria via `product.categoria?.nome`.
- Adicionar ao carrinho: montar `CartItem` (sem `key`) com `precoUnit: precoVarejo(product)`, `maxEstoque` do tamanho/ް cor.
- Botão leva a `/carrinho` (comportamento normal; a variação "comprar agora" é só na `/surpresa`).
- Textos neutros.

- [ ] **Step 3: `app/produto/[slug]/page.tsx`**

Adaptar da referência. `getProduct(slug)`: query direta com o mesmo `select` da vitrine, `.eq("slug", slug).maybeSingle()`. `notFound()` se nulo. `generateMetadata` com `nome`/`descricao`. `revalidate = 0`. Renderiza `<Header/> <ProductDetail/> <PaymentsStrip/> <SiteFooter/>`.

- [ ] **Step 4: Verificar** — `npm run build`; abrir `/produto/<slug-de-um-produto>` no dev.

- [ ] **Step 5: Commit**

```bash
git add components/ProductGallery.tsx components/ProductDetail.tsx app/produto/
git commit -m "feat: página de produto (galeria + detalhe)"
```

---

## Task 16: Carrinho `app/carrinho/page.tsx`

**Files:**
- Create: `app/carrinho/page.tsx`

**Interfaces:**
- Consumes: `useCart`, `Header`, `SiteFooter`.
- Produces: rota `/carrinho`.

- [ ] **Step 1: Implementar**

Adaptar de `reference/lojatania-main/app/carrinho/page.tsx`. Client component (`"use client"`). Lista `items` do `useCart`, ajuste de quantidade (`setQuantidade`, limitado por `maxEstoque`), remover (`removeItem`), subtotal por linha e `totalValor`. Botão "Finalizar compra" → `/checkout`. Estado vazio com link para `/`. Guardar contra `!hydrated` (mostrar skeleton/nada até hidratar). Textos neutros.

- [ ] **Step 2: Verificar** — adicionar item pela PDP, abrir `/carrinho`, alterar quantidade, remover.

- [ ] **Step 3: Commit**

```bash
git add app/carrinho/
git commit -m "feat: página de carrinho"
```

---

## Task 17: Checkout — `app/checkout/actions.ts` + `app/checkout/page.tsx`

**Files:**
- Create: `app/checkout/actions.ts`, `app/checkout/page.tsx`

**Interfaces:**
- Consumes: `supabase()`, `criarPreferencia`, `montarBackUrls` (via `criarPreferencia`), `useCart`.
- Produces:
  - `type ItemCarrinhoInput = { produtoId; colorId; sizeId: string|null; nome; cor: string|null; tamanho: string|null; quantidade: number; precoUnit: number }`
  - `type DadosEntrega = { nome; telefone; entregaTipo: "retirada"|"entrega"|"entrega_fora"; rua?; numero?; bairro?; complemento?; cep?; cidade? }`
  - `criarPedido(itens: ItemCarrinhoInput[], dados: DadosEntrega): Promise<{ url?: string; error?: string }>`

- [ ] **Step 1: `app/checkout/actions.ts`**

Adaptar de `reference/lojatania-main/app/checkout/actions.ts`. Mudanças:
- Remover `ADMIN_SECRET` — `checkout_iniciar_pedido` não recebe mais secret.
- Chamar `supabase().rpc("checkout_iniciar_pedido", { p_cliente_nome, p_cliente_telefone, p_entrega_tipo, p_endereco_rua, p_endereco_numero, p_endereco_bairro, p_endereco_complemento, p_endereco_cep, p_endereco_cidade, p_items: itens.map(i => ({ produto_id: i.produtoId, color_id: i.colorId, size_id: i.sizeId, quantidade: i.quantidade })), p_is_atacado: false, p_customer_id: null, p_revendedor_id: null })`.
- Ler `data.id` do retorno (`data` é jsonb `{ id }`).
- `origin` a partir de `headers()` (`host` + `x-forwarded-proto`), com fallback para `process.env.NEXT_PUBLIC_SITE_URL ?? ""` (adicionar essa env opcional ao `.env.local.example`).
- Linha de taxa de entrega na preferência MP: quando `entregaTipo === "entrega"`, buscar o valor via nova RPC pública? Não — a Tânia usa constante. Melhor: `checkout_iniciar_pedido` já gravou `entrega_taxa` no pedido; ler de volta `public_get_order(id)` e, se `> 0`, adicionar item `{ titulo: `Taxa de entrega (${cidade})`, quantidade: 1, precoUnitario: taxa }`. `cidade` = `admin_config.cidade_taxa` — vem no `public_get_order`? Não. Adicionar `cidade_taxa` ao JSON de `public_get_order` **ou** exibir "Taxa de entrega" sem cidade. Escolha: label fixo "Taxa de entrega" (sem cidade) para não vazar config; ajustar `montarItensMP`.
- `entrega_fora`: sem taxa no MP (frete a combinar).
- Mensagens de erro amigáveis (mapear `estoque insuficiente`).
- `successPath: `/pedido/${orderId}``.

- [ ] **Step 2: `app/checkout/page.tsx`**

Adaptar da referência. Client component. Formulário: nome, telefone, seletor de `entregaTipo` (3 opções com explicação de cada), campos de endereço condicionais (`entrega`/`entrega_fora`), campo cidade só em `entrega_fora`. Resumo do carrinho + total (+ aviso "taxa de entrega calculada no checkout" quando `entrega`; "frete a combinar por WhatsApp" quando `entrega_fora`). Submit → `criarPedido(itens, dados)`; em sucesso `window.location.href = url`; em erro exibe mensagem. Limpar carrinho **não** aqui (só quando o pagamento confirmar) — mas guardar `orderId` não é necessário. Textos neutros; menção a "Pix ou cartão via Mercado Pago".

- [ ] **Step 3: Verificar (ponta a ponta em sandbox)**

Com `MP_ACCESS_TOKEN` de teste na env: adicionar item, preencher checkout `retirada`, submeter → redireciona para o `init_point` do MP. (Pagamento real testado na Task 19.)

- [ ] **Step 4: Commit**

```bash
git add app/checkout/
git commit -m "feat: checkout (server action + formulário) integrado ao Mercado Pago"
```

---

## Task 18: `app/pedido/[id]/page.tsx`

**Files:**
- Create: `app/pedido/[id]/page.tsx`

**Interfaces:**
- Consumes: `supabase()` → `rpc("public_get_order", { p_id })`, `ORDER_STATUS_LABEL`, `entregaTipoLabel`.
- Produces: rota `/pedido/[id]`.

- [ ] **Step 1: Implementar**

Adaptar de `reference/lojatania-main/app/pedido/[id]/page.tsx`. Server component, `revalidate = 0`. Busca `public_get_order`. `notFound()` se nulo. Mostra: número do pedido (`id.slice(0,8)`), status (`ORDER_STATUS_LABEL`), lista de itens, tipo de entrega + endereço, `valor_produtos` / `entrega_taxa` / `valor_total`, aviso "frete a combinar" se `entrega_fora`. Ler `searchParams.pagamento` (`sucesso|falha|pendente`) para um banner no topo ("Pagamento aprovado! / Pagamento não concluído — tente de novo / Pagamento em processamento"). Link para WhatsApp (`BRAND.whatsappUrl`) para dúvidas. Textos neutros.

> Next 16: `params` e `searchParams` são `Promise` — `const { id } = await params; const sp = await searchParams;`.

- [ ] **Step 2: Verificar** — abrir `/pedido/<id-de-um-pedido-de-fumaça>` com e sem `?pagamento=sucesso`.

- [ ] **Step 3: Commit**

```bash
git add app/pedido/
git commit -m "feat: página de status/rastreio do pedido"
```

---

## Task 19: Webhook `app/api/webhook/mercadopago/route.ts`

**Files:**
- Create: `app/api/webhook/mercadopago/route.ts`
- Test: `__tests__/webhook-extrair.test.ts`

**Interfaces:**
- Consumes: `supabase()`, `buscarPagamento`, `mapFormaPagamento`, `ADMIN_WEBHOOK_SECRET` (env), `NTFY_TOPIC` (env), `BRAND`.
- Produces: `POST` e `GET` handlers. Exporta `extrairPaymentId(req): Promise<string | null>` para teste (ou versão pura `parsePaymentId(url: URL, body: unknown)`).

- [ ] **Step 1: Teste que falha** — `__tests__/webhook-extrair.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { parsePaymentId } from "@/app/api/webhook/mercadopago/route";

describe("parsePaymentId", () => {
  it("lê data.id da query", () => {
    expect(parsePaymentId(new URL("https://x/y?data.id=123&type=payment"), null)).toBe("123");
  });
  it("lê id da query quando não há topic", () => {
    expect(parsePaymentId(new URL("https://x/y?id=456"), null)).toBe("456");
  });
  it("lê do body JSON tipo payment", () => {
    expect(parsePaymentId(new URL("https://x/y"), { type: "payment", data: { id: 789 } })).toBe("789");
  });
  it("retorna null sem pistas", () => {
    expect(parsePaymentId(new URL("https://x/y"), null)).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar** — `npm test` → FAIL.

- [ ] **Step 3: Implementar**

Adaptar de `reference/lojatania-main/app/api/webhook/mercadopago/route.ts`. Mudanças:
- Remover `ADMIN_SECRET` literal e a função `logDebug` / `admin_log_notificacao` (sem `notification_log` nesta build).
- `NTFY_TOPIC` e o segredo vêm de `process.env` (`ADMIN_WEBHOOK_SECRET`, `NTFY_TOPIC`).
- Extrair `parsePaymentId(url: URL, body: unknown): string | null` (pura) e manter `extrairPaymentId(req)` como wrapper que faz `await req.json().catch(()=>null)`.
- `mp_register_order_payment` chamado com `p_secret: process.env.ADMIN_WEBHOOK_SECRET`.
- `notificarVenda`: usa `public_get_order`, monta corpo (cliente, valor `toLocaleString pt-BR BRL`, itens, entrega). `Title: `Nova venda — ${BRAND.nome}``, `Click: `${origin}/admin`` (derivar `origin` do request), `Tags: moneybag`, `Priority: high`. Best-effort (try/catch, nunca lança).
- Manter `GET = POST`.
- `export const dynamic = "force-dynamic";`

- [ ] **Step 4: Rodar e ver passar** — `npm test` → PASS.

- [ ] **Step 5: Verificação ponta a ponta (manual, sandbox)**

Deploy de preview OU `next dev` + túnel: fazer um checkout, pagar com Pix de teste no MP sandbox, confirmar: retorno para `/pedido/<id>?pagamento=sucesso`, `orders.status='pago'`, estoque baixado, linha em `sales`, notificação recebida no app ntfy (assinar o `NTFY_TOPIC`). Reenviar o mesmo webhook (repost) → sem duplicar.

- [ ] **Step 6: Commit**

```bash
git add app/api/webhook/ __tests__/webhook-extrair.test.ts
git commit -m "feat: webhook Mercado Pago + notificação ntfy"
```

---

## Task 20: `/minha-conta` (busca por telefone)

**Files:**
- Create: `app/minha-conta/actions.ts`, `app/minha-conta/page.tsx`

**Interfaces:**
- Consumes: `supabase()` → `rpc("public_lookup_orders", { p_telefone })`.
- Produces: `buscarPedidosPorTelefone(telefone: string): Promise<Order[]>`; rota `/minha-conta`.

- [ ] **Step 1: `app/minha-conta/actions.ts`**

Copiar de `reference/lojatania-main/app/minha-conta/actions.ts` (só troca de tipos se necessário). `"use server"`, chama `public_lookup_orders`, retorna `data as Order[]` ou `[]`.

- [ ] **Step 2: `app/minha-conta/page.tsx`**

Adaptar da referência. Client component com campo de telefone + botão; chama a server action; lista pedidos com link para `/pedido/[id]` (número, data, status, total). Estado vazio ("nenhum pedido para esse telefone"). Nesta fase **sem** login — um aviso "Em breve: crie uma conta para ver seu histórico automaticamente" é opcional. Textos neutros.

- [ ] **Step 3: Verificar** — buscar pelo telefone de um pedido de fumaça.

- [ ] **Step 4: Commit**

```bash
git add app/minha-conta/
git commit -m "feat: acompanhamento de pedidos por telefone"
```

---

## Task 21: `/surpresa` + `SurpresaOffer`

**Files:**
- Create: `app/surpresa/page.tsx`, `components/SurpresaOffer.tsx`

**Interfaces:**
- Consumes: `supabase()` → `rpc("public_get_surpresa")`, `precoVarejo`, `precisaNumeracao`, `useCart`, `useRouter`.
- Produces: rota `/surpresa` (`noindex`).

- [ ] **Step 1: `components/SurpresaOffer.tsx`**

Adaptar de `reference/lojatania-main/components/SurpresaOffer.tsx`. Mudanças:
- `precoComDesconto` → `precoVarejo`; `product.categoria === "sandalia"` → `precisaNumeracao(product.categoria?.grupo)`.
- Logo/textos → `BRAND`. WhatsApp → `BRAND.whatsappUrl`.
- Manter o fluxo "Comprar agora" → `addItem` + `router.push("/checkout")` (pula o carrinho).

- [ ] **Step 2: `app/surpresa/page.tsx`**

Adaptar da referência. `metadata.robots: { index: false, follow: false }`, `revalidate = 0`. Chama `public_get_surpresa`. Sem produto → tela "nenhuma oferta ativa" (links Instagram/WhatsApp/coleção via `BRAND`). Com produto → `<SurpresaOffer product={...} />`.

- [ ] **Step 3: Verificar** — marcar `surpresa_ativo` num produto via SQL (`update products set surpresa_ativo=true where ...`), abrir `/surpresa`; desmarcar e ver a tela vazia.

- [ ] **Step 4: Commit**

```bash
git add app/surpresa/ components/SurpresaOffer.tsx
git commit -m "feat: página de oferta de live (/surpresa)"
```

---

## Task 22: Admin — shell, auth, `AdminApp`

**Files:**
- Create: `app/admin/page.tsx`, `app/admin/actions.ts`, `components/admin/LoginForm.tsx`, `components/admin/AdminApp.tsx`

**Interfaces:**
- Consumes: `supabase()` RPCs de admin, `cookies()`.
- Produces (`app/admin/actions.ts`, `"use server"`):
  - `isLoggedIn(): Promise<boolean>`
  - `loginAdmin(prev, formData): Promise<{ error?: string }>`
  - `logoutAdmin(): Promise<void>`
  - `changePassword(oldSenha: string, newSenha: string): Promise<{ error?: string }>`
  - `fetchProducts(): Promise<Product[]>`, `fetchCategorias(): Promise<Categoria[]>`, `fetchOrders(p_filtro): Promise<Order[]>`, `fetchSales(p_filtro): Promise<Sale[]>`, `fetchConfig(): Promise<{ taxa_entrega_local:number; whatsapp:string; cidade_taxa:string } | null>`
  - Constante `COOKIE_NAME = "lola_admin_secret"`; helper `getSecret()`.

- [ ] **Step 1: `app/admin/actions.ts` — auth + fetchers**

Adaptar de `reference/lojatania-main/app/admin/actions.ts`. Mudanças:
- `COOKIE_NAME = "lola_admin_secret"`.
- `loginAdmin`: valida chamando `supabase().rpc("admin_list_categorias", { p_secret: senha })` (qualquer RPC de admin serve; categorias é barata). Erro → `{ error: "Senha incorreta." }`. Sucesso → grava cookie (flags do Global Constraints).
- `fetchOrders(p_filtro = "todos")` / `fetchSales(p_filtro = "todos")` passam `p_filtro`.
- Adicionar `fetchCategorias`, `fetchConfig`.
- Manter `changePassword` (usa `admin_set_secret`, regrava cookie).

- [ ] **Step 2: `components/admin/LoginForm.tsx`**

Copiar da referência; trocar "Painel Tânia" / "Coleção Despertar" por `` `Painel ${BRAND.nome}` `` e subtítulo neutro.

- [ ] **Step 3: `app/admin/page.tsx`**

Adaptar da referência. Server component `revalidate = 0`. `if (!await isLoggedIn()) return <LoginForm />;`. Senão `Promise.all` de `fetchProducts/fetchCategorias/fetchOrders/fetchSales/fetchConfig` e renderiza `<AdminApp .../>`.

- [ ] **Step 4: `components/admin/AdminApp.tsx` — só o shell de abas**

Adaptar da referência. Client. Abas: `produtos | categorias | pedidos | financeiro | config`. Estado local com os dados iniciais + funções `refresh*`. Nesta task, renderizar placeholders `<div>` para cada aba exceto o cabeçalho/nav (as abas reais entram nas Tasks 23–26). `logoutAdmin` no topo.

- [ ] **Step 5: Verificar** — `/admin` pede senha; senha do seed entra; recarregar mantém sessão; logout limpa.

- [ ] **Step 6: Commit**

```bash
git add app/admin/ components/admin/LoginForm.tsx components/admin/AdminApp.tsx
git commit -m "feat: admin shell + autenticação por senha única"
```

---

## Task 23: Admin — aba Produtos + `ProductEditor`

**Files:**
- Create: `components/admin/ProductEditor.tsx`
- Modify: `app/admin/actions.ts` (actions de produto/cor/tamanho), `components/admin/AdminApp.tsx` (aba produtos)

**Interfaces:**
- Consumes: `fetchProducts`, `fetchCategorias`.
- Produces (`actions.ts`):
  - `saveProduct(payload): Promise<{ error?: string; id?: string }>` — payload com `{ id: string|null; nome; categoria_id; colecao; preco; desconto_percentual: number|null; preco_atacado: number|null; descricao; caracteristicas: string[]; ativo; destaque; ordem; slug }`
  - `deleteProduct(id)`, `setAtivo(id, ativo)`, `setDesconto(id, pct|null)`, `setSurpresa(id, ativo)`
  - `saveColor(payload)`, `deleteColor(id)`, `saveSize(payload)`, `deleteSize(id)`

- [ ] **Step 1: Actions de produto/cor/tamanho em `app/admin/actions.ts`**

Adaptar da referência (`saveProduct` etc.). Mudanças: `saveProduct` chama `admin_upsert_product` com `p_categoria_id` (novo) e `p_preco_atacado` (novo); remover `p_mp_payment_link`. Demais (`saveColor`/`saveSize`/deletes/`setAtivo`/`setDesconto`/`setSurpresa`) iguais à referência, só trocando nomes de RPC se divergirem deste plano (§ Task 8).

- [ ] **Step 2: `components/admin/ProductEditor.tsx`**

Adaptar de `reference/lojatania-main/components/admin/ProductEditor.tsx`. Mudanças:
- Campo categoria: `<select>` de `categorias` (prop nova), agrupado por `grupo` via `<optgroup>` ("Calçados" / "Acessórios"), valor = `categoria_id`.
- Novo campo `preco_atacado` (número, opcional) com dica "deixe vazio para usar o % da subcategoria".
- Manter `desconto_percentual` (varejo).
- Remover campo `mp_payment_link`.
- Sub-editores de cores (nome, hex, upload de imagens → base64 via `FileReader.readAsDataURL`) e tamanhos (`tamanho`, `estoque`) por cor — iguais à referência.
- Textos neutros.

- [ ] **Step 3: Aba Produtos no `AdminApp.tsx`**

Adaptar a aba da referência: lista de produtos com thumbnail (`capaImagem`), nome, categoria, preço, `totalEstoque`, e ações rápidas: alternar visível (`setAtivo`), editar desconto varejo (`setDesconto`), toggle Surpresa (`setSurpresa`), abrir `ProductEditor`, excluir (`deleteProduct` com `confirm`). "Novo produto" abre editor vazio.

- [ ] **Step 4: Verificar** — cadastrar categoria (aguarda Task 24) OU usar as do seed: criar produto com 2 cores, imagens, tamanhos; aparece na vitrine; editar; togglar surpresa; excluir.

- [ ] **Step 5: Commit**

```bash
git add components/admin/ProductEditor.tsx components/admin/AdminApp.tsx app/admin/actions.ts
git commit -m "feat(admin): CRUD de produtos, cores, tamanhos e ações rápidas"
```

---

## Task 24: Admin — aba Categorias

**Files:**
- Create: `components/admin/CategoriasTab.tsx`
- Modify: `app/admin/actions.ts`, `components/admin/AdminApp.tsx`

**Interfaces:**
- Produces (`actions.ts`): `saveCategoria(payload): Promise<{ error?: string; id?: string }>` — `{ id: string|null; grupo: "calcados"|"acessorios"; nome; slug; ordem; ativo; desconto_atacado_percentual: number|null }`; `deleteCategoria(id): Promise<{ error?: string }>`.

- [ ] **Step 1: Actions**

```ts
export async function saveCategoria(payload: {
  id: string | null; grupo: "calcados" | "acessorios"; nome: string; slug: string;
  ordem: number; ativo: boolean; desconto_atacado_percentual: number | null;
}): Promise<{ error?: string; id?: string }> {
  const secret = await getSecret();
  if (!secret) return { error: "Não autenticado." };
  const { data, error } = await supabase().rpc("admin_upsert_categoria", {
    p_secret: secret, p_id: payload.id, p_grupo: payload.grupo, p_nome: payload.nome,
    p_slug: payload.slug, p_ordem: payload.ordem, p_ativo: payload.ativo,
    p_desconto_atacado_percentual: payload.desconto_atacado_percentual,
  });
  if (error) return { error: error.message };
  return { id: data as string };
}
export async function deleteCategoria(id: string): Promise<{ error?: string }> {
  const secret = await getSecret();
  if (!secret) return { error: "Não autenticado." };
  const { error } = await supabase().rpc("admin_delete_categoria", { p_secret: secret, p_id: id });
  if (error) return { error: error.message.includes("produtos") ? "Categoria tem produtos — mova ou exclua antes." : error.message };
  return {};
}
```

- [ ] **Step 2: `components/admin/CategoriasTab.tsx`**

Client. Tabela de categorias agrupadas por `grupo`. Cada linha: nome, slug (auto de `slugify(nome)` se vazio), ordem, ativo, `desconto_atacado_percentual` (número %, opcional — "usado no preço de atacado, Fase 3"). Form inline para criar/editar; botão excluir com `confirm`. Após salvar, `onChange()` recarrega.

- [ ] **Step 3: Ligar no `AdminApp.tsx`** — renderizar `<CategoriasTab categorias={...} onChange={refreshCategorias} />` na aba `categorias`.

- [ ] **Step 4: Verificar** — criar "Bota" em Calçados; aparece no `<select>` do `ProductEditor`; tentar excluir categoria com produto → mensagem de bloqueio.

- [ ] **Step 5: Commit**

```bash
git add components/admin/CategoriasTab.tsx components/admin/AdminApp.tsx app/admin/actions.ts
git commit -m "feat(admin): CRUD de categorias com % de atacado"
```

---

## Task 25: Admin — abas Pedidos e Financeiro (com filtro Varejo/Atacado)

**Files:**
- Create: `components/admin/PedidosTab.tsx`, `components/admin/SalesTab.tsx`
- Modify: `app/admin/actions.ts`, `components/admin/AdminApp.tsx`

**Interfaces:**
- Produces (`actions.ts`): `updateOrderStatus(id, status): Promise<{ error?: string }>`; `insertSale(payload): Promise<{ error?: string }>` (payload + `is_atacado: boolean`); `deleteSale(id): Promise<{ error?: string }>`. `fetchOrders`/`fetchSales` já aceitam `p_filtro` (Task 22).

- [ ] **Step 1: Actions** — adaptar `updateOrderStatus`, `insertSale` (adicionar `p_is_atacado`), `deleteSale` da referência.

- [ ] **Step 2: `components/admin/PedidosTab.tsx`**

Adaptar de `reference/lojatania-main/components/admin/PedidosTab.tsx`. Adicionar no topo um seletor **Todos / Varejo / Atacado** que chama `onFiltro(filtro)` → o `AdminApp` re-`fetchOrders(filtro)` e passa a lista nova. Contador do título reflete a lista filtrada. Manter expand de itens, `select` de status com opções por `entrega_tipo`. Mostrar tag "Atacado" quando `o.is_atacado`.

- [ ] **Step 3: `components/admin/SalesTab.tsx`**

Adaptar de `reference/lojatania-main/components/admin/SalesTab.tsx`. Adicionar o mesmo seletor **Todos / Varejo / Atacado** (via `onFiltro`). Os 3 cards (total geral, este mês, nº vendas) calculam sobre a lista **já filtrada**. Formulário "Lançar venda" ganha um seletor Varejo/Atacado (`is_atacado`). Manter tabela e exclusão.

- [ ] **Step 4: `AdminApp.tsx`** — estado `orderFiltro` / `salesFiltro`; handlers que chamam `fetchOrders`/`fetchSales` com o filtro e atualizam o estado; passar `orders`/`sales` + `onFiltro` para as abas.

- [ ] **Step 5: Verificar** — com pedidos de fumaça (todos varejo nesta fase), os filtros funcionam (Atacado fica vazio); mudar status de um pedido; lançar e excluir venda manual; cards recalculam com o filtro.

- [ ] **Step 6: Commit**

```bash
git add components/admin/PedidosTab.tsx components/admin/SalesTab.tsx components/admin/AdminApp.tsx app/admin/actions.ts
git commit -m "feat(admin): abas Pedidos e Financeiro com filtro varejo/atacado"
```

---

## Task 26: Admin — aba Config

**Files:**
- Modify: `components/admin/AdminApp.tsx` (aba `config`), `app/admin/actions.ts`

**Interfaces:**
- Produces (`actions.ts`): `saveConfig(payload: { taxa_entrega_local: number; whatsapp: string; cidade_taxa: string }): Promise<{ error?: string }>` (chama `admin_set_config`). `changePassword` já existe (Task 22).

- [ ] **Step 1: `saveConfig` em `actions.ts`**

```ts
export async function saveConfig(payload: {
  taxa_entrega_local: number; whatsapp: string; cidade_taxa: string;
}): Promise<{ error?: string }> {
  const secret = await getSecret();
  if (!secret) return { error: "Não autenticado." };
  const { error } = await supabase().rpc("admin_set_config", {
    p_secret: secret, p_taxa: payload.taxa_entrega_local,
    p_whatsapp: payload.whatsapp, p_cidade: payload.cidade_taxa,
  });
  if (error) return { error: error.message };
  return {};
}
```

- [ ] **Step 2: Aba Config no `AdminApp.tsx`**

Dois blocos:
1. **Entrega e contato:** inputs `taxa_entrega_local` (número, R$), `cidade_taxa` (texto), `whatsapp` (texto, só dígitos) → `saveConfig`. Dados iniciais de `fetchConfig()`.
2. **Trocar senha:** senha atual + nova (mín. 8) → `changePassword`; feedback de sucesso/erro.

- [ ] **Step 3: Verificar** — setar taxa R$ 10 e cidade; criar checkout `entrega` → preferência MP inclui linha "Taxa de entrega" R$ 10 e o pedido grava `entrega_taxa = 10`. Trocar a senha; relogar com a nova.

- [ ] **Step 4: Commit**

```bash
git add components/admin/AdminApp.tsx app/admin/actions.ts
git commit -m "feat(admin): aba de configuração (taxa de entrega, contato, senha)"
```

---

## Task 27: README + checklist de deploy + QA final

**Files:**
- Create: `README.md`
- Modify: `AGENTS.md` (garantir bloco nextjs preservado; adicionar nota de projeto)

- [ ] **Step 1: `README.md`**

Documentar: stack; como rodar (`npm install`, `.env.local` a partir do `.example`, `npm run dev`); como aplicar migrations (`supabase/migrations/*` em ordem, via CLI `supabase db push` ou dashboard); env vars e onde obtê-las; que a senha do `/admin` e o `ADMIN_WEBHOOK_SECRET` foram gerados na migration `0003` e entregues à parte; URL do webhook a cadastrar no painel Mercado Pago (`https://<dominio>/api/webhook/mercadopago`); como assinar o tópico `NTFY_TOPIC` no app ntfy.

- [ ] **Step 2: Rodar o checklist de QA da Fase 1 do spec (§16)**

Executar cada item do checklist "Fase 1" do spec contra um deploy de preview da Vercel com Supabase real e `MP_ACCESS_TOKEN` (sandbox ou produção conforme combinado). Anotar resultado de cada item no PR. Qualquer falha vira correção antes do merge.

- [ ] **Step 3: `npm run build && npm run lint && npm test`**

Expected: tudo verde.

- [ ] **Step 4: Commit**

```bash
git add README.md AGENTS.md
git commit -m "docs: README, deploy e checklist de QA da Fase 1"
```

---

## Self-Review (feita ao escrever o plano)

**Cobertura do spec (§ do spec → task):**
- §3 estrutura/stack → Task 1. `brand.config` §4.2 → Task 2. Tokens §4 → Task 3. Env §4.1 → Tasks 1, 4, 27.
- §4.3 `admin_config` → Tasks 6, 9 (coluna webhook), 26 (edição).
- §5.1 enums, §5.2 tabelas Fase 1, §5.5 RLS → Task 6. Colunas de atacado inertes → Tasks 6, 23, 24.
- §6.1 RPCs públicas → Task 7. §6.2 webhook RPC → Task 9. §6.3 RPCs admin → Task 8 (+ config em 8/9).
- §7 regras de preço → Task 5 (helpers TS) + Task 7 (`_preco_varejo`/`_preco_atacado` no checkout).
- §8.1 vitrine → Task 14. §8.2 PDP → Task 15. §8.3 carrinho → Tasks 11, 16. §8.4 checkout → Tasks 10, 17. §8.5 `/pedido/[id]` → Task 18. §8.6 `/minha-conta` → Task 20. §8.7 `/surpresa` → Task 21.
- §9 admin (todas as abas) → Tasks 22–26.
- §12 webhook + ntfy → Task 19.
- §13 testes → Tasks 5, 10, 11, 19 (Vitest) + §16 QA manual → Task 27.
- Fora de escopo Fase 1 (login, atacado ativo) → não implementado, por design.

**Placeholder scan:** sem "TBD"/"implementar depois". Pontos onde o plano manda "adaptar da referência" sempre vêm com lista explícita de mudanças + arquivo-fonte no `reference/`. As duas senhas em `0003_seed.sql` são geradas no passo (não placeholders de código — são segredos operacionais, marcados `<...>` de propósito).

**Consistência de tipos/nomes:**
- Cookie `lola_admin_secret` — Global Constraints, Tasks 22.
- `checkout_iniciar_pedido` assinatura idêntica em §6.1 do spec, Task 7 (SQL) e Task 17 (chamada).
- `precoVarejo` / `precoAtacado` — Task 5 define, Tasks 13/15/17 consomem; nome único (não sobrou `precoComDesconto` em nenhum passo de código novo — só citado como "renomear a partir da referência").
- `mp_register_order_payment(p_secret, p_order_id, p_mp_payment_id, p_forma_pagamento)` — Task 9 define, Task 19 chama com os mesmos nomes.
- `p_filtro ∈ todos|varejo|atacado` — Task 8 (SQL), Task 22 (fetchers), Task 25 (UI) consistentes.
- `assert_webhook` usa `admin_config.webhook_secret_hash` (Task 9) — coerente com `ADMIN_WEBHOOK_SECRET` env nas Global Constraints e Task 19.

---

## Execution Handoff

**Plano salvo em `docs/superpowers/plans/2026-09-09-loja-lola-fase1-varejo.md`. Duas opções de execução:**

**1. Subagent-Driven (recomendado)** — um subagente novo por task, revisão entre tasks, iteração rápida.

**2. Inline Execution** — executar as tasks nesta sessão com `executing-plans`, em lotes com checkpoints de revisão.

**Qual abordagem?**
