# Loja LOLA — Recriação visual da Home (sub-projeto 1) — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recriar visualmente a Home (`app/page.tsx`) e o chrome compartilhado
(`Header`, `TrustStrip`, `PaymentsFooter`) da Loja LOLA com uma nova
linguagem — paleta "Bright Pastels" com cor por categoria, tipografia
vibrante (Bricolage Grotesque + Onest + Space Mono) e um elemento-assinatura
próprio (swing tag / etiqueta de calçado) — inspirada na estrutura de um
UI kit de e-commerce de moda do Figma, sem copiá-lo literalmente.

**Architecture:** Next.js 16 App Router, componentes React existentes
mantêm seus contratos de props (nenhuma rota ou lógica de dados muda).
Toda a mudança é de apresentação: novos tokens CSS em `app/globals.css`,
três componentes novos (`SwingTag`, `CategoryChips`, `BrandStory`) e a
reestilização de `Header`, `HeroCarousel`, `ProductCard`, `TrustStrip`,
`PaymentsFooter` e `app/page.tsx`. Segue o padrão já usado no repo:
CSS custom properties + `style={{ ... }}` inline + classes utilitárias em
`app/globals.css` — não introduz Tailwind classes (o projeto importa
Tailwind mas nunca usa suas classes; todo o styling atual é CSS
hand-rolled).

**Tech Stack:** Next.js 16, TypeScript, React 19, CSS custom properties,
Vitest (só para a função pura de mapeamento de cor por categoria).

**Spec:** `docs/superpowers/specs/2026-09-15-loja-lola-home-recriacao-design.md`

## Global Constraints

- `npm run build`, `npm run lint` e `npm test` continuam obrigatoriamente
  verdes ao final de cada task.
- **Tokens legados preservados:** `--brand-pink`, `--accent`, `--accent-deep`
  e `--font-serif` continuam definidos em `app/globals.css` com os MESMOS
  valores de hoje — são usados por páginas fora de escopo (produto,
  carrinho, checkout, pedido, minha-conta, surpresa, admin) que só entram
  num sub-projeto futuro. Nenhuma task deste plano remove ou renomeia
  esses tokens.
- **Tokens compartilhados que PODEM mudar de valor no lugar** (mesmo nome,
  valor novo, efeito sitewide de baixo risco, mesmo padrão já usado no
  rebranding anterior): `--font-sans` (passa a `"Onest"`), `--surface-muted`
  (passa a `#F5ECE2`).
- **Classes CSS globais que NÃO podem ser alteradas** (compartilhadas com
  páginas fora de escopo — confirmado por grep antes deste plano):
  `.btn`, `.btn-outline`, `.unica`, `.swatches` (e `.swatches button` /
  `.swatches button.active`), `.badge` (regra base — pode ser sobrescrita
  por `style` inline por instância, nunca editada na definição da classe),
  `.split`, `.split-media`, `.tile` (e variantes) — são CSS morto hoje ou
  usados por `ProductDetail`/`SurpresaOffer`; não mexer.
- **Classes CSS globais que só a Home usa e PODEM ser livremente
  reescritas:** `.serif`, `.sans-strong`, `.section-title`,
  `.section-title .sans-strong`, `.section-sub`, `.prod-grid`,
  `.prod-card` e seus descendentes exceto `.badge`/`.unica`/`.swatches`
  citados acima, `.payments`, `.payments .item` (usadas só em
  `PaymentsFooter.tsx`, confirmado por grep).
- Nenhuma prop de componente muda de forma: `HeroSlide` (em
  `HeroCarousel.tsx`) e as props de `ProductCard` continuam com os mesmos
  campos e tipos. `useCart()` continua a única fonte do contador do
  carrinho.
- Contraste: todo texto sobre fundo pastel (`--pink`, `--mint`, `--lilac`,
  `--peach`, e gradientes entre eles) usa **`var(--ink)`** — nunca branco
  nem `var(--muted)` sobre pastel. Isso resolve de antemão o problema de
  contraste que apareceu no rebranding anterior.
- `prefers-reduced-motion` é respeitado em qualquer animação nova (o
  carrossel já faz isso — não regredir).
- **Ruling sobre motion:** o spec descreve a entrada do hero/BrandStory
  como "fade/slide sutil ao rolar a página até a seção" (scroll-triggered).
  Este plano simplifica para uma entrada em `mount` via CSS `@keyframes`
  (classe `.fade-up`, Task 1) em vez de `IntersectionObserver` — evita
  criar um componente cliente novo só pra isso, e a diferença prática é
  pequena (o hero já está visível no primeiro viewport; o BrandStory fica
  perto o bastante do scroll inicial). Se o controller achar insuficiente
  na QA visual (Task 12), trocar por scroll-reveal fica pra uma iteração
  futura, não bloqueia esta entrega.
- A verificação de grep de tokens antigos (`var(--brand-pink`,
  `var(--accent`, `Fraunces`, `Plus Jakarta`) na Task 12 é **escopada aos
  arquivos tocados por este plano** (listados na Task 12) — não ao repo
  inteiro, porque páginas fora de escopo mantêm esses tokens de propósito.

---

### Task 1: Tokens de design, fontes e classes utilitárias de base

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`

**Interfaces:**
- Produz (consumido por todas as tasks seguintes): as CSS custom
  properties `--pink`, `--pink-deep`, `--mint`, `--mint-deep`, `--lilac`,
  `--lilac-deep`, `--peach`, `--peach-deep`, `--font-display`,
  `--font-mono`, `--fs-hero`, `--fs-h2`, `--fs-h3`, `--fs-wordmark`; o
  valor de `--font-sans` e `--surface-muted` atualizado; as classes
  `.swing-tag`, `.swing-tag--sm`, `.swing-tag--md`, `.swing-tag--lg` e
  `.fade-up` (entrada suave, respeita `prefers-reduced-motion`).

- [ ] **Passo 1: Atualizar `:root` em `app/globals.css`**

Adicionar as linhas abaixo dentro do bloco `:root { ... }` existente
(depois de `--line: #EFE0DB;`), e trocar o valor de `--surface-muted` e
`--font-sans` in-place:

```css
:root {
  --bg: #FDF6F3;
  --surface: #FFFFFF;
  --surface-muted: #F5ECE2;
  --brand-pink: #F3C4C6;
  --ink: #2B2420;
  --ink-soft: #6B5B4E;
  --accent: #FFB069;
  --accent-deep: #E8944A;
  --muted: #8C8079;
  --line: #EFE0DB;
  --font-serif: "Fraunces", serif;
  --font-sans: "Onest", -apple-system, sans-serif;

  --pink: #FF8FAB;
  --pink-deep: #F2678F;
  --mint: #8FE3C8;
  --mint-deep: #5FCBA9;
  --lilac: #C7A8FF;
  --lilac-deep: #A87EF0;
  --peach: #FFA45C;
  --peach-deep: #E8823A;
  --font-display: "Bricolage Grotesque", sans-serif;
  --font-mono: "Space Mono", monospace;

  --fs-hero: clamp(40px, 8vw, 96px);
  --fs-h2: clamp(28px, 5vw, 48px);
  --fs-h3: clamp(20px, 3vw, 28px);
  --fs-wordmark: clamp(64px, 14vw, 180px);
}
```

Não remova nenhuma linha existente do bloco — só adicione as novas e
troque o valor das duas linhas indicadas.

- [ ] **Passo 2: Adicionar a classe base do swing tag ao final de `app/globals.css`**

```css
/* Swing tag — elemento-assinatura (etiqueta de calçado). Usado por
   ProductCard (preço), HeroCarousel (placeholder) e CategoryChips
   (navegação por categoria). Ver SwingTag.tsx. */
.swing-tag {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono), monospace;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 700;
  color: var(--ink);
  background: var(--tag-color, var(--peach));
  clip-path: polygon(14px 0, 100% 0, 100% 100%, 14px 100%, 0 50%);
  transform: rotate(var(--tag-rotate, -4deg));
  transition: transform 0.2s ease;
  text-decoration: none;
  border: none;
  cursor: default;
}

a.swing-tag,
button.swing-tag {
  cursor: pointer;
}

.swing-tag:hover {
  transform: rotate(calc(var(--tag-rotate, -4deg) / 2)) translateY(-1px);
}

.swing-tag::before {
  content: "";
  position: absolute;
  left: 7px;
  top: 50%;
  transform: translateY(-50%);
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--bg);
}

.swing-tag::after {
  content: "";
  position: absolute;
  left: 4px;
  top: -8px;
  width: 1px;
  height: 10px;
  background: var(--ink-soft);
  opacity: 0.45;
  transform: rotate(25deg);
  transform-origin: bottom;
}

.swing-tag--sm {
  font-size: 10.5px;
  padding: 5px 10px 5px 16px;
}

.swing-tag--md {
  font-size: 12.5px;
  padding: 7px 14px 7px 20px;
}

.swing-tag--lg {
  font-size: clamp(14px, 2vw, 18px);
  padding: 10px 18px 10px 26px;
}

/* Entrada suave usada pelo hero (Task 7) e pelo BrandStory (Task 5).
   Só roda se o usuário não pediu less motion. */
@media (prefers-reduced-motion: no-preference) {
  @keyframes fade-up {
    from {
      opacity: 0;
      transform: translateY(14px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .fade-up {
    animation: fade-up 0.6s ease both;
  }
}
```

- [ ] **Passo 3: Trocar o `<link>` de fontes em `app/layout.tsx`**

Em `app/layout.tsx`, trocar o `href` do `<link rel="stylesheet">` (linha
25) de:

```
https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap
```

para:

```
https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Onest:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap
```

(Mantém Fraunces — ainda usada por `--font-serif` em páginas fora de
escopo — e adiciona as três fontes novas. Remove Plus Jakarta Sans, que
não é mais referenciada por nome em lugar nenhum.)

- [ ] **Passo 4: Verificar**

Rodar:

```bash
npm run build
```

Esperado: build verde, sem erros de CSS/sintaxe. (Não há teste automatizado
para tokens CSS — a verificação visual acontece nas tasks seguintes,
quando os tokens passam a ser usados.)

- [ ] **Passo 5: Commit**

```bash
git add app/globals.css app/layout.tsx
git commit -m "feat: tokens de cor/tipografia e swing tag para a recriação da Home"
```

---

### Task 2: Mapeamento de cor por categoria

**Files:**
- Modify: `lib/brand.config.ts`
- Test: `__tests__/brand-config.test.ts`

**Interfaces:**
- Consome: `Categoria` de `lib/types.ts` (`{ grupo: "calcados" | "acessorios"; nome: string; ... }`).
- Produz (consumido pelas Tasks 4 e 8): `corDaCategoria(categoria)`, que
  retorna `{ base: string; deep: string }` com valores `"var(--pink)"` /
  `"var(--pink-deep)"` etc.

- [ ] **Passo 1: Escrever o teste (falha esperada)**

Criar `__tests__/brand-config.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { corDaCategoria } from "@/lib/brand.config";

describe("corDaCategoria", () => {
  it("sandália (calçados) → mint", () => {
    expect(
      corDaCategoria({ grupo: "calcados", nome: "Sandália" })
    ).toEqual({ base: "var(--mint)", deep: "var(--mint-deep)" });
  });

  it("sapatilha (calçados) → lilac", () => {
    expect(
      corDaCategoria({ grupo: "calcados", nome: "Sapatilha" })
    ).toEqual({ base: "var(--lilac)", deep: "var(--lilac-deep)" });
  });

  it("tênis e outros calçados → pink", () => {
    expect(
      corDaCategoria({ grupo: "calcados", nome: "Tênis" })
    ).toEqual({ base: "var(--pink)", deep: "var(--pink-deep)" });
    expect(
      corDaCategoria({ grupo: "calcados", nome: "Bota" })
    ).toEqual({ base: "var(--pink)", deep: "var(--pink-deep)" });
  });

  it("acessórios (bolsas) → peach", () => {
    expect(
      corDaCategoria({ grupo: "acessorios", nome: "Bolsas" })
    ).toEqual({ base: "var(--peach)", deep: "var(--peach-deep)" });
  });

  it("categoria ausente → peach (fallback)", () => {
    expect(corDaCategoria(null)).toEqual({
      base: "var(--peach)",
      deep: "var(--peach-deep)",
    });
    expect(corDaCategoria(undefined)).toEqual({
      base: "var(--peach)",
      deep: "var(--peach-deep)",
    });
  });

  it("é case-insensitive no nome da categoria", () => {
    expect(
      corDaCategoria({ grupo: "calcados", nome: "SANDÁLIA rasteira" })
    ).toEqual({ base: "var(--mint)", deep: "var(--mint-deep)" });
  });
});
```

- [ ] **Passo 2: Rodar e confirmar que falha**

```bash
npm test -- brand-config
```

Esperado: FAIL — `corDaCategoria is not exported` (ou similar).

- [ ] **Passo 3: Implementar `corDaCategoria` em `lib/brand.config.ts`**

Adicionar ao final de `lib/brand.config.ts` (mantendo o `export const
BRAND` existente intocado):

```ts
type CorCategoria = { base: string; deep: string };

const COR_PADRAO: CorCategoria = { base: "var(--peach)", deep: "var(--peach-deep)" };

// Cor por categoria: cada grupo de produto (calçados/acessórios) ganha
// um tom da paleta "Bright Pastels", usado no swing tag do produto e
// nos chips de categoria da Home. Ver docs/superpowers/specs/2026-09-15-loja-lola-home-recriacao-design.md.
export function corDaCategoria(
  categoria:
    | { grupo?: "calcados" | "acessorios" | null; nome?: string | null }
    | null
    | undefined
): CorCategoria {
  if (!categoria) return COR_PADRAO;
  const nome = (categoria.nome ?? "").toLowerCase();

  if (categoria.grupo === "calcados") {
    if (nome.includes("sandál") || nome.includes("sandal")) {
      return { base: "var(--mint)", deep: "var(--mint-deep)" };
    }
    if (nome.includes("sapatilh")) {
      return { base: "var(--lilac)", deep: "var(--lilac-deep)" };
    }
    return { base: "var(--pink)", deep: "var(--pink-deep)" };
  }

  if (categoria.grupo === "acessorios") {
    return COR_PADRAO;
  }

  return COR_PADRAO;
}
```

- [ ] **Passo 4: Rodar e confirmar que passa**

```bash
npm test -- brand-config
```

Esperado: PASS, todos os `it` verdes.

- [ ] **Passo 5: Commit**

```bash
git add lib/brand.config.ts __tests__/brand-config.test.ts
git commit -m "feat: mapeamento de cor por categoria (corDaCategoria)"
```

---

### Task 3: Componente `SwingTag`

**Files:**
- Create: `components/SwingTag.tsx`

**Interfaces:**
- Consome: a classe `.swing-tag` (+ variantes) da Task 1.
- Produz (consumido pelas Tasks 4, 7 e 8): `<SwingTag>` — componente
  React com a API:
  ```ts
  {
    children: React.ReactNode;
    color?: string;       // default "var(--peach)"
    size?: "sm" | "md" | "lg"; // default "sm"
    rotate?: number;      // graus, default -4
    href?: string;        // se presente, renderiza <Link>
    onClick?: () => void; // se presente (e sem href), renderiza <button>
    className?: string;
  }
  ```

- [ ] **Passo 1: Criar `components/SwingTag.tsx`**

```tsx
import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";

export type SwingTagSize = "sm" | "md" | "lg";

export default function SwingTag({
  children,
  color = "var(--peach)",
  size = "sm",
  rotate = -4,
  href,
  onClick,
  className,
}: {
  children: ReactNode;
  color?: string;
  size?: SwingTagSize;
  rotate?: number;
  href?: string;
  onClick?: () => void;
  className?: string;
}) {
  const style = {
    "--tag-color": color,
    "--tag-rotate": `${rotate}deg`,
  } as CSSProperties;
  const cls = `swing-tag swing-tag--${size}${className ? ` ${className}` : ""}`;

  if (href) {
    return (
      <Link href={href} className={cls} style={style}>
        {children}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" className={cls} style={style} onClick={onClick}>
        {children}
      </button>
    );
  }

  return (
    <span className={cls} style={style}>
      {children}
    </span>
  );
}
```

- [ ] **Passo 2: Verificar**

```bash
npm run build
npm run lint
```

Esperado: ambos verdes (não há teste unitário — é um componente de
apresentação puro; sua renderização é verificada visualmente quando
consumido nas Tasks 4/7/8).

- [ ] **Passo 3: Commit**

```bash
git add components/SwingTag.tsx
git commit -m "feat: componente SwingTag (elemento-assinatura)"
```

---

### Task 4: Componente `CategoryChips`

**Files:**
- Create: `components/CategoryChips.tsx`

**Interfaces:**
- Consome: `SwingTag` (Task 3), `corDaCategoria` (Task 2), tipo
  `Categoria` de `lib/types.ts`.
- Produz (consumido pela Task 11): `<CategoryChips categorias={Categoria[]} />`.
  Não faz query própria — recebe a lista já carregada pela Home. Cada chip
  linka para `/#calcados` ou `/#acessorios` (as âncoras de seção que já
  existem hoje em `app/page.tsx` via `<section id="calcados">` /
  `<section id="acessorios">` — não cria âncoras novas por categoria).

- [ ] **Passo 1: Criar `components/CategoryChips.tsx`**

```tsx
import type { Categoria } from "@/lib/types";
import { corDaCategoria } from "@/lib/brand.config";
import SwingTag from "@/components/SwingTag";

export default function CategoryChips({ categorias }: { categorias: Categoria[] }) {
  if (categorias.length === 0) return null;

  return (
    <section style={{ padding: "8px 0 40px" }}>
      <div className="wrap chip-row">
        {categorias.map((c, i) => {
          const cor = corDaCategoria(c);
          return (
            <SwingTag
              key={c.id}
              href={`/#${c.grupo}`}
              color={cor.base}
              size="md"
              rotate={i % 2 === 0 ? -4 : 4}
            >
              {c.nome}
            </SwingTag>
          );
        })}
      </div>
      <style>{`
        .chip-row {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 18px 14px;
        }
      `}</style>
    </section>
  );
}
```

- [ ] **Passo 2: Verificar**

```bash
npm run build
npm run lint
```

Esperado: ambos verdes.

- [ ] **Passo 3: Commit**

```bash
git add components/CategoryChips.tsx
git commit -m "feat: componente CategoryChips (navegação por categoria)"
```

---

### Task 5: Componente `BrandStory`

**Files:**
- Create: `components/BrandStory.tsx`

**Interfaces:**
- Produz (consumido pela Task 11): `<BrandStory />` — sem props, texto e
  placeholders internos. Produz também as classes globais `.eyebrow-mono`
  e `.section-head` (definidas no `<style>` deste componente), que a
  Task 11 reaproveita para os títulos de seção da Home.

- [ ] **Passo 1: Criar `components/BrandStory.tsx`**

```tsx
export default function BrandStory() {
  return (
    <section className="section">
      <div className="wrap brand-story-grid fade-up">
        <div className="brand-story-copy">
          <span className="eyebrow-mono">Sobre a LOLA</span>
          <h2 className="brand-story-title">Feito pra combinar com você</h2>
          <p>
            Cada par nasce pra acompanhar seus dias — do compromisso sério
            ao role sem hora pra acabar. Cores que conversam entre si,
            conforto que não pede desculpas.
          </p>
        </div>
        <div className="brand-story-collage">
          <div className="collage-ph collage-ph--a">
            <span>Espaço reservado</span>
          </div>
          <div className="collage-ph collage-ph--b">
            <span>Espaço reservado</span>
          </div>
          <div className="collage-ph collage-ph--c">
            <span>Espaço reservado</span>
          </div>
        </div>
      </div>
      <style>{`
        .eyebrow-mono {
          display: inline-block;
          font-family: var(--font-mono), monospace;
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--peach-deep);
        }
        .section-head {
          text-align: center;
          margin-bottom: 36px;
        }
        .section-head .section-title-new {
          font-family: var(--font-display), sans-serif;
          font-weight: 800;
          font-size: var(--fs-h2);
          line-height: 1;
          margin: 10px 0 0;
        }

        .brand-story-grid {
          display: grid;
          grid-template-columns: 1fr 1.3fr;
          gap: 48px;
          align-items: center;
        }
        @media (max-width: 860px) {
          .brand-story-grid { grid-template-columns: 1fr; }
        }
        .brand-story-title {
          font-family: var(--font-display), sans-serif;
          font-size: var(--fs-h2);
          font-weight: 800;
          line-height: 1;
          margin: 12px 0 16px;
        }
        .brand-story-copy p {
          color: var(--ink-soft);
          font-size: 15px;
          line-height: 1.6;
          max-width: 42ch;
          margin: 0;
        }
        .brand-story-collage {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        @media (max-width: 640px) {
          .brand-story-collage { grid-template-columns: repeat(3, 1fr); gap: 10px; }
        }
        .collage-ph {
          aspect-ratio: 3 / 4;
          border-radius: 14px;
          background: var(--surface-muted);
          border: 1px dashed var(--line);
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 10px;
        }
        .collage-ph span {
          font-size: 10.5px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--ink);
          opacity: 0.55;
        }
        .collage-ph--a { transform: translateY(-18px); background: var(--pink); border: none; }
        .collage-ph--b { transform: translateY(14px); }
        .collage-ph--c { transform: translateY(-6px); background: var(--mint); border: none; }
        @media (max-width: 640px) {
          .collage-ph { transform: none !important; }
        }
      `}</style>
    </section>
  );
}
```

- [ ] **Passo 2: Verificar**

```bash
npm run build
npm run lint
```

Esperado: ambos verdes.

- [ ] **Passo 3: Commit**

```bash
git add components/BrandStory.tsx
git commit -m "feat: componente BrandStory (colagem + manifesto de marca)"
```

---

### Task 6: Reestilização do `Header`

**Files:**
- Modify: `components/Header.tsx`

**Interfaces:**
- Consome: `useCart()` (mesma API), `BRAND` de `lib/brand.config.ts`.
- Não muda comportamento (menu mobile, link do carrinho, contador) — só
  marcação/classes visuais.

- [ ] **Passo 1: Substituir o conteúdo de `components/Header.tsx`**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { BRAND } from "@/lib/brand.config";
import { useCart } from "@/lib/cart";

const NAV_LINKS = [
  { href: "/#calcados", label: "Calçados" },
  { href: "/#acessorios", label: "Acessórios" },
  { href: "/minha-conta", label: "Minha conta" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const { totalItens } = useCart();

  return (
    <header className="site-header">
      <div className="wrap site-header-pill">
        <button
          aria-label="Abrir menu"
          aria-expanded={open}
          aria-controls="mobileNav"
          onClick={() => setOpen((v) => !v)}
          className="menu-btn"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth={1.8} width={21} height={21}>
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>

        <Link href="/" className="site-logo">
          {/* TODO: trocar por <img> quando a logo existir */}
          {BRAND.nome}
        </Link>

        <nav className="nav-main" aria-label="Categorias">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="nav-link">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="site-header-actions">
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--ink-soft)" strokeWidth={1.5} width={19} height={19} aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <Link href="/carrinho" className="cart-link" aria-label="Carrinho">
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--ink-soft)" strokeWidth={1.5} width={20} height={20}>
              <path d="M6 8h12l-1.2 11.2a1.5 1.5 0 0 1-1.5 1.3H8.7a1.5 1.5 0 0 1-1.5-1.3L6 8z" />
              <path d="M9 8V6a3 3 0 0 1 6 0v2" />
            </svg>
            {totalItens > 0 && <span className="cart-badge">{totalItens}</span>}
          </Link>
        </div>
      </div>

      <nav id="mobileNav" className="mobile-nav" style={{ display: open ? "flex" : "none" }}>
        {NAV_LINKS.map((l) => (
          <a
            key={l.href}
            href={l.href}
            onClick={() => setOpen(false)}
            className="mobile-nav-link"
          >
            {l.label}
          </a>
        ))}
      </nav>

      <style>{`
        .site-header { padding: 18px 0; background: var(--bg); }
        .site-header-pill {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          background: var(--surface);
          border-radius: 999px;
          padding: 12px 22px;
          box-shadow: 0 1px 0 var(--line), 0 12px 28px -20px rgba(43,36,32,.35);
        }
        .site-logo {
          font-family: var(--font-display), sans-serif;
          font-weight: 800;
          font-size: 22px;
          letter-spacing: -0.01em;
          color: var(--ink);
          flex: none;
        }
        .nav-main { display: flex; gap: 6px; }
        .nav-link {
          font-family: var(--font-mono), monospace;
          font-size: 11px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--ink-soft);
          padding: 8px 14px;
          border-radius: 999px;
          transition: background .2s ease, color .2s ease;
        }
        .nav-link:hover, .nav-link:focus-visible {
          background: var(--pink);
          color: var(--ink);
        }
        .site-header-actions { display: flex; align-items: center; gap: 16px; flex: none; }
        .cart-link { position: relative; display: flex; }
        .cart-badge {
          position: absolute;
          top: -7px;
          right: -8px;
          background: var(--peach);
          color: var(--ink);
          font-size: 9.5px;
          font-weight: 700;
          border-radius: 50%;
          min-width: 15px;
          height: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 3px;
        }
        .menu-btn {
          display: none;
          background: none;
          border: none;
          padding: 4px;
          cursor: pointer;
        }
        .mobile-nav {
          flex-direction: column;
          background: var(--surface);
          border-radius: 18px;
          margin: 8px 20px 0;
          overflow: hidden;
          box-shadow: 0 12px 28px -20px rgba(43,36,32,.35);
        }
        .mobile-nav-link {
          padding: 15px 22px;
          font-size: 13px;
          letter-spacing: .05em;
          text-transform: uppercase;
          color: var(--ink);
          border-top: 1px solid var(--line);
          min-height: 44px;
          display: flex;
          align-items: center;
        }
        @media (max-width: 820px) {
          .nav-main { display: none !important; }
          .menu-btn { display: flex !important; }
        }
      `}</style>
    </header>
  );
}
```

- [ ] **Passo 2: Verificar**

```bash
npm run build
npm run lint
```

Esperado: ambos verdes. Rodar `npm run dev` e conferir visualmente (menu
mobile abre/fecha, badge do carrinho aparece com item no carrinho, foco
de teclado visível no nav e no botão de menu).

- [ ] **Passo 3: Commit**

```bash
git add components/Header.tsx
git commit -m "feat: reestiliza Header com nav em pill e nova identidade"
```

---

### Task 7: Reestilização do `HeroCarousel` (placeholder)

**Files:**
- Modify: `components/HeroCarousel.tsx`

**Interfaces:**
- Consome: `SwingTag` (Task 3). A prop `HeroSlide` **não muda de forma**.
- O modo "com imagem" (`s.src` truthy) não é tocado neste plano — só o
  modo placeholder (`s.src === null`) e a cor dos dots (compartilhados
  entre os dois modos).

- [ ] **Passo 1: Adicionar o import de `SwingTag`**

No topo de `components/HeroCarousel.tsx`, adicionar:

```tsx
import SwingTag from "@/components/SwingTag";
```

- [ ] **Passo 2: Substituir o bloco do placeholder**

Substituir o bloco `else` do placeholder (o `<div>` com
`background: "var(--brand-pink)"` e o `<div style={{ border: "1px dashed..." }}>`
dentro dele, linhas ~99-136 do arquivo atual) por:

```tsx
<div key={i} className="hero-placeholder">
  <div className="hero-placeholder-grain" aria-hidden />
  <div className="hero-placeholder-inner fade-up">
    <SwingTag color="var(--peach)" size="lg" rotate={-6}>
      {s.placeholderLabel ?? "Nova coleção"}
    </SwingTag>
    <h2 className="hero-placeholder-title">Nova coleção</h2>
    <p className="hero-placeholder-sub">Espaço reservado — aguardando imagem</p>
  </div>
</div>
```

(Mantém a mesma posição no array de `slides.map`, o `key={i}` e o
`style={{ position: "relative", width: ..., height: "100%", flex: "none" }}`
do wrapper original — mova esses estilos de posicionamento para a classe
`.hero-placeholder` no passo 4, já que agora o layout interno mudou.)

- [ ] **Passo 3: Atualizar a cor dos dots**

No bloco dos dots (bullets do carrossel), trocar o `style` do `<button>`
de:

```tsx
style={{
  width: 8,
  height: 8,
  borderRadius: "50%",
  border: "1.5px solid #fff",
  background: i === current ? "#fff" : "rgba(255,255,255,.35)",
  padding: 0,
  cursor: "pointer",
}}
```

para:

```tsx
style={{
  width: 8,
  height: 8,
  borderRadius: "50%",
  border: "1.5px solid var(--ink)",
  background: i === current ? "var(--ink)" : "rgba(43,36,32,.35)",
  padding: 0,
  cursor: "pointer",
}}
```

(Os slides hoje são só placeholders — fundo claro — então os dots
precisam de contraste escuro, não claro.)

- [ ] **Passo 4: Adicionar as classes novas ao `<style>` já existente no
  componente**

Dentro do `<style>{\`...\`}</style>` já existente em `HeroCarousel.tsx`,
adicionar (mantendo as regras `.hero-img-mobile`/`@media` já existentes):

```css
.hero-placeholder {
  position: relative;
  width: 100%;
  height: 100%;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  overflow: hidden;
  background: linear-gradient(135deg, var(--pink) 0%, var(--peach) 100%);
}
.hero-placeholder-grain {
  position: absolute;
  inset: 0;
  opacity: 0.18;
  background-image: radial-gradient(rgba(43, 36, 32, 0.5) 1px, transparent 1px);
  background-size: 3px 3px;
  mix-blend-mode: multiply;
}
.hero-placeholder-inner {
  position: relative;
  z-index: 1;
  padding: 0 24px;
}
.hero-placeholder-title {
  font-family: var(--font-display), sans-serif;
  font-weight: 800;
  font-size: var(--fs-hero);
  line-height: 0.95;
  color: var(--ink);
  margin: 18px 0 8px;
}
.hero-placeholder-sub {
  font-family: var(--font-sans), sans-serif;
  font-size: 13px;
  color: var(--ink);
  opacity: 0.65;
  margin: 0;
}
```

- [ ] **Passo 5: Verificar**

```bash
npm run build
npm run lint
```

Rodar `npm run dev`, abrir a Home e conferir visualmente o hero (3 slides
placeholder, troca automática, dots legíveis, swing tag visível e não
cortado pelo `overflow: hidden` do `<section>` pai — se o `::after` do
swing tag (a "cordinha") for cortado, ajustar `overflow` do
`.hero-placeholder-inner` para `visible`, o `overflow: hidden` deve ficar
só no `<section>` externo).

- [ ] **Passo 6: Commit**

```bash
git add components/HeroCarousel.tsx
git commit -m "feat: reestiliza placeholder do HeroCarousel com textura e swing tag"
```

---

### Task 8: Reestilização do `ProductCard`

**Files:**
- Modify: `components/ProductCard.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consome: `SwingTag` (Task 3), `corDaCategoria` (Task 2). Props do
  componente não mudam.
- **Não editar** as classes `.badge` (base), `.unica`, `.swatches` /
  `.swatches button` / `.swatches button.active` em `app/globals.css` —
  são compartilhadas com `ProductDetail.tsx`/`SurpresaOffer.tsx` (fora de
  escopo). Sobrescrever cor só via `style` inline por instância.

- [ ] **Passo 1: Editar `components/ProductCard.tsx`**

Adicionar o import e o cálculo da cor no topo da função, e trocar o bloco
do preço e o badge de destaque:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { precoVarejo, precoAtacado, precisaNumeracao, type Product } from "@/lib/types";
import { corDaCategoria } from "@/lib/brand.config";
import SwingTag from "@/components/SwingTag";

export default function ProductCard({
  product,
  modo = "varejo",
}: {
  product: Product;
  modo?: "varejo" | "atacado";
}) {
  const colors = product.colors ?? [];
  const [activeColorIdx, setActiveColorIdx] = useState(0);
  const activeColor = colors[activeColorIdx];
  const img = activeColor?.imagens?.[0] ?? null;
  const temTamanhos = colors.some((c) => c.sizes.length > 0);
  const href = product.slug ? `/produto/${product.slug}` : "#";
  const temDesconto =
    modo === "varejo" &&
    product.desconto_percentual != null &&
    product.desconto_percentual > 0;
  const precoFinal =
    modo === "atacado"
      ? precoAtacado(product, product.categoria)
      : precoVarejo(product);
  const cor = corDaCategoria(product.categoria);

  return (
    <div className="prod-card">
      <Link href={href} className="imgwrap" style={{ display: "block" }}>
        {product.destaque && (
          <span className="badge" style={{ background: cor.base }}>
            Destaque
          </span>
        )}
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={product.nome} />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--muted)",
              fontSize: 11,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            Sem foto ainda
          </div>
        )}
      </Link>
      <div className="prod-info">
        <div className="coll">{product.categoria?.nome ?? ""}</div>
        <Link href={href}>
          <h3>{product.nome}</h3>
        </Link>
        <div className="price-row">
          {temDesconto && (
            <span className="price-old">
              {product.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          )}
          <SwingTag color={cor.base} size="sm" rotate={-3}>
            {precoFinal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </SwingTag>
        </div>
        {precisaNumeracao(product.categoria?.grupo) && (
          <div className="sizes">
            {temTamanhos ? "Confira os tamanhos disponíveis" : "Tamanhos a cadastrar"}
          </div>
        )}
        {colors.length > 1 ? (
          <div className="swatches">
            {colors.map((c, i) => (
              <button
                key={c.id}
                className={i === activeColorIdx ? "active" : ""}
                style={{ background: c.hex || "#ccc" }}
                title={c.nome}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveColorIdx(i);
                }}
              />
            ))}
          </div>
        ) : colors.length === 1 ? (
          <div className="unica">Cor única</div>
        ) : null}
      </div>
    </div>
  );
}
```

- [ ] **Passo 2: Adicionar as classes novas em `app/globals.css`**

Adicionar ao final do arquivo (não editar `.badge`/`.unica`/`.swatches`
existentes):

```css
.price-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 6px;
}
.price-old {
  font-size: 11px;
  color: var(--muted);
  text-decoration: line-through;
}
```

Também trocar, dentro do bloco já existente `.prod-info h3 { ... }`, a
linha `font-family: var(--font-serif), serif;` para
`font-family: var(--font-display), sans-serif;` e `font-weight: 500;`
para `font-weight: 700;` (essa classe é usada só por `ProductCard` —
confirmado por grep antes deste plano).

- [ ] **Passo 3: Verificar**

```bash
npm run build
npm run lint
```

Rodar `npm run dev`, checar a Home: preço em swing tag colorido por
categoria, badge "Destaque" na cor da categoria, trocar de cor/swatch
ainda funciona.

- [ ] **Passo 4: Commit**

```bash
git add components/ProductCard.tsx app/globals.css
git commit -m "feat: preço do ProductCard em swing tag colorido por categoria"
```

---

### Task 9: Reestilização do `TrustStrip`

**Files:**
- Modify: `components/TrustStrip.tsx`

**Interfaces:**
- `ITEMS` (dados) não muda. Todo o CSS deste componente já vive num
  `<style>` interno ao próprio arquivo — não é compartilhado com nenhuma
  outra página (confirmado por grep).

- [ ] **Passo 1: Substituir o conteúdo de `components/TrustStrip.tsx`**

```tsx
import type { CSSProperties } from "react";
import { BRAND } from "@/lib/brand.config";

const ITEMS = [
  {
    icon: <path d="M3 12l7-7 7 7M6 10.5V20h12v-9.5" />,
    t1: BRAND.nome,
    t2: "Calçados e acessórios",
  },
  {
    icon: (
      <>
        <rect x="3" y="6" width="18" height="13" rx="1.5" />
        <path d="M3 10h18M8 6V4h8v2" />
      </>
    ),
    t1: "Pix ou cartão",
    t2: "Pagamento pelo Mercado Pago",
  },
  {
    icon: <path d="M12 3l7 3.5v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9v-5L12 3z" />,
    t1: "Compra segura",
    t2: "Checkout oficial Mercado Pago",
  },
  {
    icon: <path d="M21 11.5a8.5 8.5 0 10-3.8 7.1L21 20l-1.2-3.6c.8-1.2 1.2-2.6 1.2-4.9z" />,
    t1: "Atendimento",
    t2: "Fale com a gente no WhatsApp",
    href: BRAND.whatsappUrl,
  },
];

export default function TrustStrip() {
  return (
    <section className="trust-strip">
      <div className="wrap trust-grid">
        {ITEMS.map((it, i) => {
          const content = (
            <>
              <span className="trust-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth={1.4} width={22} height={22}>
                  {it.icon}
                </svg>
              </span>
              <div>
                <div className="trust-t1">{it.t1}</div>
                <div className="trust-t2">{it.t2}</div>
              </div>
            </>
          );
          const itemStyle: CSSProperties = { color: "inherit", textDecoration: "none" };
          return it.href ? (
            <a key={i} href={it.href} target="_blank" rel="noopener noreferrer" className="trust-item" style={itemStyle}>
              {content}
            </a>
          ) : (
            <div key={i} className="trust-item" style={itemStyle}>
              {content}
            </div>
          );
        })}
      </div>
      <style>{`
        .trust-strip { background: var(--bg); padding: 8px 0 28px; }
        .trust-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
        }
        .trust-item {
          display: flex;
          align-items: center;
          gap: 12px;
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 16px;
          padding: 14px 16px;
        }
        .trust-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--peach);
          flex: none;
        }
        .trust-t1 { font-size: 12.5px; font-weight: 700; letter-spacing: 0.02em; }
        .trust-t2 { font-size: 11px; color: var(--muted); margin-top: 2px; }
        @media (max-width: 820px) {
          .trust-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 520px) {
          .trust-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </section>
  );
}
```

- [ ] **Passo 2: Verificar**

```bash
npm run build
npm run lint
```

Rodar `npm run dev`, conferir visualmente em desktop e ≤ 400px (deve
empilhar em 1 coluna).

- [ ] **Passo 3: Commit**

```bash
git add components/TrustStrip.tsx
git commit -m "feat: reestiliza TrustStrip em chips arredondados"
```

---

### Task 10: Reestilização do `PaymentsFooter`

**Files:**
- Modify: `components/PaymentsFooter.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- `PaymentsStrip` e `SiteFooter` continuam exportados com a mesma
  assinatura (sem props). `.payments` / `.payments .item` são usadas só
  neste arquivo (confirmado por grep) — podem ser editadas livremente.

- [ ] **Passo 1: Editar as classes `.payments` / `.payments .item` em
  `app/globals.css`**

Substituir o bloco existente:

```css
.payments {
  background: var(--surface-muted);
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}

.payments .wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 46px;
  padding: 30px 32px;
  flex-wrap: wrap;
}

.payments .item {
  font-size: 11.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  font-weight: 600;
  opacity: 0.8;
}
```

por:

```css
.payments {
  background: var(--surface-muted);
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}

.payments .wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 14px;
  padding: 22px 32px;
  flex-wrap: wrap;
}

.payments .item {
  font-family: var(--font-mono), monospace;
  font-size: 10.5px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink);
  font-weight: 700;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 8px 16px;
}
```

E o `@media (max-width: 640px) { .payments .wrap { ... } }` logo abaixo
continua igual (só remove o `text-align: center` se estiver lá — os
chips já centralizam via `justify-items: center` existente).

- [ ] **Passo 2: Adicionar o wordmark gigante em `SiteFooter`**

Em `components/PaymentsFooter.tsx`, dentro de `export function SiteFooter()`,
adicionar um bloco `.footer-wordmark` entre o `</div>` que fecha
`footer-grid` e o `<div style={{ borderTop: ... }}>` do copyright:

```tsx
        <div className="footer-wordmark" aria-hidden="true">
          {BRAND.nome}
        </div>
```

E, logo depois do `</footer>` (ou dentro dele, num `<style>` inline —
seguir o padrão já usado em `TrustStrip.tsx`), adicionar:

```tsx
      <style>{`
        .footer-wordmark {
          font-family: var(--font-display), sans-serif;
          font-weight: 800;
          font-size: var(--fs-wordmark);
          line-height: 0.85;
          text-align: center;
          color: var(--ink);
          opacity: 0.92;
          margin: 8px 0 28px;
          letter-spacing: -0.02em;
        }
      `}</style>
```

(`aria-hidden="true"` porque é uma repetição decorativa do nome da marca
— o link acessível pro nome já existe no `Header`.)

- [ ] **Passo 3: Verificar**

```bash
npm run build
npm run lint
```

Rodar `npm run dev`, rolar até o rodapé e conferir o wordmark (não deve
estourar a largura da tela em nenhum breakpoint — `clamp()` já cuida
disso, mas confirmar visualmente em 375px).

- [ ] **Passo 4: Commit**

```bash
git add components/PaymentsFooter.tsx app/globals.css
git commit -m "feat: PaymentsStrip em chips e wordmark gigante no rodapé"
```

---

### Task 11: Montagem da Home (`app/page.tsx`)

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Consome: `CategoryChips` (Task 4), `BrandStory` (Task 5, que também
  produz as classes `.eyebrow-mono`/`.section-head`/`.section-title-new`
  reaproveitadas aqui).
- Não muda a lógica de dados (`getProducts`, `agruparPorCategoria`,
  filtros de estoque/categoria) — só a composição de seções e os títulos.

- [ ] **Passo 1: Adicionar os imports novos**

No topo de `app/page.tsx`, adicionar:

```tsx
import CategoryChips from "@/components/CategoryChips";
import BrandStory from "@/components/BrandStory";
import type { Categoria } from "@/lib/types";
```

- [ ] **Passo 2: Trocar o título de `GrupoSection`**

Dentro de `GrupoSection`, trocar:

```tsx
        <h2 className="section-title" style={{ marginBottom: 40 }}>
          <span className="serif">{titulo}</span>
          <span className="sans-strong">{destaque}</span>
        </h2>
```

por:

```tsx
        <div className="section-head" style={{ marginBottom: 40 }}>
          <span className="eyebrow-mono">{destaque}</span>
          <h2 className="section-title-new">{titulo}</h2>
        </div>
```

- [ ] **Passo 3: Trocar o título da seção "Destaques" em `Home()`**

Trocar:

```tsx
          <h2 className="section-title" style={{ marginBottom: 40 }}>
            <span className="serif">Destaques</span>
            <span className="sans-strong">da loja</span>
          </h2>
```

por:

```tsx
          <div className="section-head" style={{ marginBottom: 40 }}>
            <span className="eyebrow-mono">da loja</span>
            <h2 className="section-title-new">Destaques</h2>
          </div>
```

- [ ] **Passo 4: Calcular as categorias visíveis e inserir `CategoryChips`
  e `BrandStory`**

Dentro de `export default async function Home()`, depois da linha que
calcula `destaques`, adicionar:

```tsx
  const categoriasVisiveis: Categoria[] = [
    ...new Map(
      products
        .filter((p) => p.categoria)
        .map((p) => [p.categoria!.id, p.categoria!] as const)
    ).values(),
  ].sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR"));
```

E no JSX, inserir `<CategoryChips categorias={categoriasVisiveis} />`
logo depois de `<TrustStrip />` e antes da seção `#destaques`; inserir
`<BrandStory />` logo depois do segundo `<GrupoSection>` (acessórios) e
antes de `<PaymentsStrip />`:

```tsx
      <Header />

      <HeroCarousel slides={[/* ...igual a hoje... */]} />

      <TrustStrip />

      <CategoryChips categorias={categoriasVisiveis} />

      <section className="section" id="destaques">
        {/* ...igual, só com o novo section-head do Passo 3... */}
      </section>

      <GrupoSection id="calcados" /* ... */ />
      <GrupoSection id="acessorios" /* ... */ />

      <BrandStory />

      <PaymentsStrip />
      <SiteFooter />
```

(Não altera as props passadas para `HeroCarousel`, `GrupoSection`,
`EmptyGrid` — só a ordem/composição de seções e os títulos.)

- [ ] **Passo 5: Ajustar `app/globals.css` para o novo `.section-title-new`
  ficar centralizado como o antigo `.section-title`**

Adicionar (não remover `.section-title`/`.serif`/`.sans-strong` — ficam
órfãos mas inofensivos; removê-los é opcional e pode ficar pra Task 12 se
o grep de verificação notar CSS morto):

```css
.section-head { text-align: center; }
```

(Essa regra pode já existir vinda da Task 5, em `BrandStory.tsx` — nesse
caso pular este passo. Se a Task 5 já cobriu isso globalmente via seu
próprio `<style>`, este passo 5 é um no-op; confirmar antes de duplicar.)

- [ ] **Passo 6: Verificar**

```bash
npm run build
npm run lint
npm test
```

Rodar `npm run dev`, abrir a Home inteira de cima a baixo (desktop e
≤ 400px): header → hero → trust strip → chips de categoria → destaques →
calçados → acessórios → brand story → payments → rodapé com wordmark.
Clicar num chip de categoria e confirmar que rola até a seção certa.

- [ ] **Passo 7: Commit**

```bash
git add app/page.tsx app/globals.css
git commit -m "feat: monta a nova Home com CategoryChips e BrandStory"
```

---

### Task 12: Verificação final e limpeza

**Files:**
- Modify (potencialmente): `app/globals.css` (remoção de CSS morto, se
  sobrar), qualquer arquivo apontado pelos greps abaixo.

- [ ] **Passo 1: Grep escopado aos arquivos tocados por este plano**

Rodar (adaptar sintaxe ao shell disponível):

```bash
grep -rn "var(--brand-pink\|var(--accent\b\|Fraunces\|Plus Jakarta" \
  app/page.tsx app/layout.tsx app/globals.css \
  components/Header.tsx components/HeroCarousel.tsx components/ProductCard.tsx \
  components/TrustStrip.tsx components/PaymentsFooter.tsx \
  components/SwingTag.tsx components/CategoryChips.tsx components/BrandStory.tsx \
  lib/brand.config.ts
```

Esperado: **zero linhas**, exceto:
- `app/globals.css` continua definindo `--brand-pink`, `--accent`,
  `--accent-deep` e `--font-serif` no `:root` (são tokens legados
  preservados de propósito — ver Global Constraints) — essas definições
  NÃO contam como falha do grep, só usos (`var(--accent)` etc.) fora do
  `:root` nos arquivos listados contam.
- `app/layout.tsx` continua carregando `Fraunces` no `<link>` (também
  preservado de propósito).

Se aparecer qualquer outro uso de `var(--accent`/`var(--brand-pink` fora
dessas exceções dentro dos arquivos listados, corrigir antes de seguir.

- [ ] **Passo 2: Checagem de contraste**

Conferir manualmente (dev tools do navegador ou uma ferramenta de
contraste) que todo texto usa `var(--ink)` sobre `--pink`/`--mint`/
`--lilac`/`--peach`/gradientes entre eles — nunca `--muted` nem branco.
Pontos a checar: swing tags (Tasks 3/4/7/8), `.hero-placeholder-sub`
(Task 7), `.collage-ph span` (Task 5), `.nav-link:hover` (Task 6).

- [ ] **Passo 3: Rodar a suíte completa**

```bash
npm run build
npm run lint
npm test
```

Esperado: os três verdes.

- [ ] **Passo 4: QA visual manual (controller/usuário)**

Não automatizado — abrir `npm run dev`, navegar a Home em desktop e
mobile (≤ 400px), conferir:
- Nenhuma página fora de escopo (produto, carrinho, checkout, pedido,
  minha-conta, surpresa, admin) mudou de conteúdo/estrutura — só herdam
  o novo Header/TrustStrip/Footer e o valor novo de `--font-sans`/
  `--surface-muted`, o resto continua com a paleta do rebranding anterior.
- Swing tags não têm o `::after` (cordinha) cortado por `overflow: hidden`
  de nenhum pai.
- Foco de teclado visível em: links do nav, botão de menu mobile, chips
  de categoria, botão de troca de cor do `ProductCard`.

- [ ] **Passo 5: Commit final (se o Passo 1 exigiu correções)**

```bash
git add -A
git commit -m "chore: verificação final da recriação visual da Home"
```

Se nenhuma correção foi necessária nos Passos 1-2, este commit não
acontece — a Task 11 já é o último commit da branch.
