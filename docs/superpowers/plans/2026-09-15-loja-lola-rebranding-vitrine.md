# Loja LOLA — Rebranding Visual da Vitrine (Sub-projeto 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar a identidade visual da loja (vitrine, PDP, carrinho, checkout, pedido, minha-conta, surpresa, chrome) da paleta provisória navy/gold para a paleta nova (rosa-poeira + marrom-oliva + destaque pêssego) com tipografia Fraunces + Plus Jakarta Sans — sem alterar nenhuma página, rota, RPC ou comportamento.

**Architecture:** Renomeação semântica das variáveis CSS em `app/globals.css` (`:root` + as regras de classe do próprio arquivo), troca das fontes carregadas em `app/layout.tsx`, e atualização componente-a-componente das referências `var(--nome-antigo)` para os novos tokens, seguindo o mapeamento fixo do spec. O painel `/admin` recebe só a troca mecânica de nomes de variável (mesmas cores/estrutura de UI, não é redesenhado) — o redesenho do admin é um sub-projeto separado, futuro.

**Tech Stack:** Next.js 16, TypeScript, Tailwind v4, CSS custom properties (sem CSS-in-JS, sem Tailwind config de tema — os componentes usam `style={{ color: "var(--x)" }}` inline + classes utilitárias de `globals.css`).

**Spec:** `docs/superpowers/specs/2026-09-15-loja-lola-rebranding-vitrine-design.md`

## Global Constraints

- Escopo **só visual** — nenhuma página, rota, componente estrutural, RPC ou fluxo muda de comportamento. Se uma task exigir mudar lógica/estrutura pra "resolver" a troca visual, PARE e reporte — não é o que foi pedido.
- `npm run build`, `npm test`, `npm run lint` continuam obrigatoriamente verdes em toda task.
- Ao final de cada task, `grep -rn "var(--navy\|var(--gold" <arquivos da task>` deve retornar **zero linhas** nos arquivos que a task tocou. A última task confere o repo inteiro (`app/` + `components/`, excluindo `reference/`).
- Também zero ocorrências de `var(--font-playfair)` / `var(--font-montserrat)` nos arquivos tocados (viram `var(--font-serif)` / `var(--font-sans)`).
- Nomes dos tokens que **ficam iguais** (só o valor muda): `--bg`, `--surface`, `--ink`, `--muted`, `--line`. Não precisam de find-replace, só a declaração em `:root` muda de valor (Task 1).
- Tabela de valores novos (usar exatamente estes hex):
  - `--bg: #FDF6F3`
  - `--surface: #FFFFFF`
  - `--surface-muted: #F5EFEC` (novo — substitui `--navy-tint`)
  - `--brand-pink: #F3C4C6` (novo)
  - `--ink: #2B2420`
  - `--ink-soft: #6B5B4E` (novo — substitui `--navy` nos usos estruturais/texto, não-CTA)
  - `--accent: #FFB069` (novo — substitui `--navy` nos usos de botão/CTA/seleção ativa, e substitui `--gold`)
  - `--accent-deep: #E8944A` (novo — substitui `--navy-deep`, e substitui `--gold-deep`)
  - `--muted: #8C8079`
  - `--line: #EFE0DB`
  - `--font-serif: "Fraunces", serif` (novo nome — substitui `--font-playfair`)
  - `--font-sans: "Plus Jakarta Sans", -apple-system, sans-serif` (novo nome — substitui `--font-montserrat`)
- **Regra de decisão `--navy` → `--accent` vs `--ink-soft`:** se o uso é fundo de botão, preço em destaque, estado "selecionado/ativo" (tamanho, cor, tab), badge de contagem, ou qualquer coisa clicável/de destaque → `--accent` (e `--navy-deep`/hover correspondente → `--accent-deep`). Se o uso é texto de marca/navegação, cor de ícone estrutural, fundo de faixa decorativa (não-interativa) → `--ink-soft`. Na dúvida, `--accent` é o padrão mais seguro (é o papel que `--navy` cobria com mais frequência).
- `--gold` e `--gold-deep` (sempre um papel de destaque secundário) → sempre `--accent` / `--accent-deep`, sem exceção.
- `--navy-tint` (sempre um fundo neutro de estado esgotado/loading/vazio) → sempre `--surface-muted`, sem exceção.
- `--navy-deep` como fundo escuro sólido (não hover de botão) → `--ink`.
- Commits terminam com: `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`

---

## Task 1: Tokens de design + fontes

**Files:**
- Modify: `app/globals.css:1-16` (bloco `:root`)
- Modify: `app/globals.css` (as 14 outras ocorrências de `var(--navy` / `var(--gold` no resto do arquivo — regras `.btn`, `.btn-outline`, `.badge`, `.unica`, etc.)
- Modify: `app/layout.tsx` (o `<link>` do Google Fonts)

**Interfaces:**
- Produces: os 12 tokens novos listados nos Global Constraints, disponíveis globalmente via `var(--nome)`. `--font-serif` carrega Fraunces; `--font-sans` carrega Plus Jakarta Sans.

- [ ] **Step 1: Reescrever o bloco `:root`**

Substituir o bloco atual (linhas 3-16 de `app/globals.css`) por:

```css
:root {
  --bg: #FDF6F3;
  --surface: #FFFFFF;
  --surface-muted: #F5EFEC;
  --brand-pink: #F3C4C6;
  --ink: #2B2420;
  --ink-soft: #6B5B4E;
  --accent: #FFB069;
  --accent-deep: #E8944A;
  --muted: #8C8079;
  --line: #EFE0DB;
  --font-serif: "Fraunces", serif;
  --font-sans: "Plus Jakarta Sans", -apple-system, sans-serif;
}
```

- [ ] **Step 2: Achar as demais ocorrências no arquivo**

Run: `grep -n "var(--navy\|var(--gold\|var(--font-playfair\|var(--font-montserrat" app/globals.css`
Expected: lista de ~19 linhas (14 de cor + 5 de fonte) — anotar os números de linha.

- [ ] **Step 3: Atualizar cada ocorrência**

Para cada linha da lista do Step 2, aplicar a regra de decisão dos Global Constraints. Exemplos esperados (o arquivo real pode variar um pouco, mas o padrão é este):
- `.btn { background: var(--navy); ... }` → `background: var(--accent);` (é botão → accent)
- `.btn:hover { background: var(--navy-deep); }` → `background: var(--accent-deep);`
- `.btn-outline` (se usar `--navy` como borda/texto estrutural, não fundo de clique) → `--ink-soft`
- qualquer `font-family: var(--font-playfair)...` → `var(--font-serif)`
- qualquer `font-family: var(--font-montserrat)...` → `var(--font-sans)`

- [ ] **Step 4: Trocar o `<link>` de fontes em `app/layout.tsx`**

Achar o `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display...">` e substituir por:

```tsx
<link
  rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
/>
```

- [ ] **Step 5: Verificar**

Run: `npm run build`
Expected: PASS.

Run: `grep -n "var(--navy\|var(--gold\|var(--font-playfair\|var(--font-montserrat" app/globals.css`
Expected: nenhuma linha (arquivo limpo). `Playfair` e `Montserrat` não aparecem mais em `app/layout.tsx`.

- [ ] **Step 6: Commit**

```bash
git add app/globals.css app/layout.tsx
git commit -m "feat: novos tokens de design (paleta + Fraunces/Plus Jakarta Sans)"
```

---

## Task 2: Chrome do site — Header, PaymentsFooter, TrustStrip

**Files:**
- Modify: `components/Header.tsx` (8 `var(--navy)`, 1 `var(--gold-deep)`, 1 `var(--font-playfair)`)
- Modify: `components/PaymentsFooter.tsx` (2 `var(--navy)`, 1 `var(--font-playfair)`)
- Modify: `components/TrustStrip.tsx` (1 `var(--navy)`, 1 `var(--font-playfair)`)

**Interfaces:**
- Consumes: os tokens da Task 1 (`--accent`, `--accent-deep`, `--ink-soft`, `--font-serif`, `--font-sans`, etc.) — precisam já existir em `:root`.

- [ ] **Step 1: Achar as ocorrências**

Run: `grep -n "var(--navy\|var(--gold\|var(--font-playfair\|var(--font-montserrat" components/Header.tsx components/PaymentsFooter.tsx components/TrustStrip.tsx`

- [ ] **Step 2: Atualizar `components/Header.tsx`**

Aplicar a regra de decisão: o nome "LOLA" no logo (texto, `--font-playfair`) → `--font-serif` + cor `--ink-soft` (é marca/estrutural, não clicável). O badge de contagem do carrinho (fundo `--gold-deep`) → `--accent-deep`. Links de navegação / ícones estruturais em `--navy` → `--ink-soft`. Qualquer elemento de estado ativo/hover clicável em `--navy` → `--accent`.

- [ ] **Step 3: Atualizar `components/PaymentsFooter.tsx`**

Título "LOLA" / cabeçalhos de coluna em `--font-playfair` → `--font-serif`. `--navy` estrutural (texto, ícones) → `--ink-soft`.

- [ ] **Step 4: Atualizar `components/TrustStrip.tsx`**

Mesma regra — ícones/texto estrutural (`--navy`) → `--ink-soft`, título (`--font-playfair`) → `--font-serif`.

- [ ] **Step 5: Verificar**

Run: `npm run build && npm run lint`
Expected: ambos PASS, sem erros novos nos 3 arquivos.

Run: `grep -n "var(--navy\|var(--gold\|var(--font-playfair\|var(--font-montserrat" components/Header.tsx components/PaymentsFooter.tsx components/TrustStrip.tsx`
Expected: nenhuma linha.

- [ ] **Step 6: Smoke visual**

Matar qualquer processo na porta 3000, `npm run dev`, abrir `/` no navegador (ou `curl -s http://localhost:3000/ | grep -o "LOLA" | head -1` pra confirmar 200 + conteúdo). Matar o dev server depois.

- [ ] **Step 7: Commit**

```bash
git add components/Header.tsx components/PaymentsFooter.tsx components/TrustStrip.tsx
git commit -m "feat: rebranding visual do header, footer e trust strip"
```

---

## Task 3: Catálogo — HeroCarousel, ProductCard, ProductGallery

**Files:**
- Modify: `components/HeroCarousel.tsx` (1 `var(--navy)`, 1 `var(--font-playfair)`)
- Modify: `components/ProductCard.tsx` (usa principalmente classes de `globals.css` já cobertas na Task 1 — conferir no Step 1 se sobrou algum `var()` inline)
- Modify: `components/ProductGallery.tsx` (1 `var(--navy)`, 2 `var(--navy-tint)`, 1 `var(--font-playfair)`)

**Interfaces:**
- Consumes: tokens da Task 1.

- [ ] **Step 1: Achar as ocorrências**

Run: `grep -n "var(--navy\|var(--gold\|var(--font-playfair\|var(--font-montserrat" components/HeroCarousel.tsx components/ProductCard.tsx components/ProductGallery.tsx`

- [ ] **Step 2: Atualizar `components/HeroCarousel.tsx`**

O placeholder de banner (fundo escuro decorativo, hoje `--navy`) → `--brand-pink` (é a faixa de destaque descrita no spec, não um CTA — usar `--brand-pink`, não `--accent`, pra não competir com os botões reais da página). Título do placeholder (`--font-playfair`) → `--font-serif`.

- [ ] **Step 3: Atualizar `components/ProductCard.tsx`**

Se o grep do Step 1 não achar nada no arquivo, pular — ele já herda tudo de classes globais atualizadas na Task 1. Se achar algum `var()` inline (preço em destaque, por exemplo), preço/badge de destaque → `--accent`; texto estrutural → `--ink-soft`.

- [ ] **Step 4: Atualizar `components/ProductGallery.tsx`**

Estado de imagem vazia/placeholder (`--navy-tint`) → `--surface-muted`. Seta/controle de navegação da galeria (`--navy`) → `--ink-soft` (é estrutural, não CTA). Legenda (`--font-playfair`) → `--font-serif`.

- [ ] **Step 5: Verificar**

Run: `npm run build && npm run lint`
Expected: PASS.

Run: `grep -n "var(--navy\|var(--gold\|var(--font-playfair\|var(--font-montserrat" components/HeroCarousel.tsx components/ProductCard.tsx components/ProductGallery.tsx`
Expected: nenhuma linha.

- [ ] **Step 6: Commit**

```bash
git add components/HeroCarousel.tsx components/ProductCard.tsx components/ProductGallery.tsx
git commit -m "feat: rebranding visual do hero, card e galeria de produto"
```

---

## Task 4: PDP e Surpresa — ProductDetail, SurpresaOffer

**Files:**
- Modify: `components/ProductDetail.tsx` (4 `var(--navy)`, 2 `var(--navy-tint)`, 1 `var(--gold-deep)`, 1 `var(--font-playfair)`)
- Modify: `components/SurpresaOffer.tsx` (8 `var(--navy)`, 1 `var(--navy-tint)`, 2 `var(--gold-deep)`, 2 `var(--font-playfair)`)

**Interfaces:**
- Consumes: tokens da Task 1. Os dois arquivos compartilham o mesmo padrão de seletor de tamanho (`esgotado ? "var(--navy-tint)" : sizeId === s.id ? "var(--navy)" : "var(--surface)"`).

- [ ] **Step 1: Achar as ocorrências**

Run: `grep -n "var(--navy\|var(--gold\|var(--font-playfair\|var(--font-montserrat" components/ProductDetail.tsx components/SurpresaOffer.tsx`

- [ ] **Step 2: Atualizar o padrão de seletor de tamanho/cor (presente nos dois arquivos)**

Padrão atual: `background: esgotado ? "var(--navy-tint)" : sizeId === s.id ? "var(--navy)" : "var(--surface)"`.
Novo: `background: esgotado ? "var(--surface-muted)" : sizeId === s.id ? "var(--accent)" : "var(--surface)"`.
(Selecionado = estado ativo/clicável → `--accent`. Esgotado = neutro → `--surface-muted`.)

- [ ] **Step 3: Atualizar o resto de `components/ProductDetail.tsx`**

Título do produto (`--font-playfair`) → `--font-serif`. Preço em destaque, marcador de "—" antes de característica (`--gold-deep`) → `--accent-deep`. Texto estrutural em `--navy` restante → `--ink-soft`.

- [ ] **Step 4: Atualizar o resto de `components/SurpresaOffer.tsx`**

Mesmo padrão do Step 3 — título/preço/urgência (`--gold-deep`) → `--accent-deep`; texto estrutural (`--navy`) → `--ink-soft`; título (`--font-playfair`) → `--font-serif`.

- [ ] **Step 5: Verificar**

Run: `npm run build && npm run lint`
Expected: PASS.

Run: `grep -n "var(--navy\|var(--gold\|var(--font-playfair\|var(--font-montserrat" components/ProductDetail.tsx components/SurpresaOffer.tsx`
Expected: nenhuma linha.

- [ ] **Step 6: Commit**

```bash
git add components/ProductDetail.tsx components/SurpresaOffer.tsx
git commit -m "feat: rebranding visual da página de produto e oferta de live"
```

---

## Task 5: Páginas — vitrine, carrinho, checkout, pedido, minha-conta, surpresa

**Files:**
- Modify: `app/page.tsx` (2 `var(--navy)`, 1 `var(--font-playfair)`)
- Modify: `app/carrinho/page.tsx` (2 `var(--navy)`, 2 `var(--navy-tint)`, 1 `var(--font-playfair)`)
- Modify: `app/checkout/page.tsx` (3 `var(--navy)`, 2 `var(--navy-tint)`, 1 `var(--font-playfair)`)
- Modify: `app/pedido/[id]/page.tsx` (2 `var(--navy)`, 1 `var(--font-playfair)`)
- Modify: `app/minha-conta/page.tsx` (1 `var(--navy)`, 1 `var(--font-playfair)`)
- Modify: `app/surpresa/page.tsx` (1 `var(--navy)`, 2 `var(--font-playfair)`)

**Interfaces:**
- Consumes: tokens da Task 1.

- [ ] **Step 1: Achar as ocorrências em todos os 6 arquivos**

Run: `grep -n "var(--navy\|var(--gold\|var(--font-playfair\|var(--font-montserrat" app/page.tsx app/carrinho/page.tsx app/checkout/page.tsx "app/pedido/[id]/page.tsx" app/minha-conta/page.tsx app/surpresa/page.tsx`

- [ ] **Step 2: Atualizar cada arquivo**

Aplicar a regra de decisão dos Global Constraints em cada ocorrência. Padrões esperados:
- Títulos de seção (`--font-playfair`) → `--font-serif`.
- Estados vazios/skeleton de loading (`--navy-tint`, presentes em `carrinho/page.tsx` e `checkout/page.tsx`) → `--surface-muted`.
- Resumo de valores, total do pedido, botão de ação em destaque (`--navy`) → `--accent`.
- Texto estrutural (rótulos, cabeçalhos que não são CTA) em `--navy` → `--ink-soft`.

- [ ] **Step 3: Verificar**

Run: `npm run build && npm run lint`
Expected: PASS.

Run: `grep -n "var(--navy\|var(--gold\|var(--font-playfair\|var(--font-montserrat" app/page.tsx app/carrinho/page.tsx app/checkout/page.tsx "app/pedido/[id]/page.tsx" app/minha-conta/page.tsx app/surpresa/page.tsx`
Expected: nenhuma linha.

- [ ] **Step 4: Smoke visual**

Matar processo na porta 3000, `npm run dev`. Checar `/`, `/carrinho`, `/checkout`, `/minha-conta`, `/surpresa` retornam 200 (`curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/<rota>` pra cada). Matar o dev server.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx app/carrinho/page.tsx app/checkout/page.tsx "app/pedido/[id]/page.tsx" app/minha-conta/page.tsx app/surpresa/page.tsx
git commit -m "feat: rebranding visual das páginas (vitrine, carrinho, checkout, pedido, minha-conta, surpresa)"
```

---

## Task 6: Admin — troca mecânica de variáveis (sem redesenho)

**Files:**
- Modify: `components/admin/AdminApp.tsx` (7 `var(--navy)`, 2 `var(--gold-deep)`, 1 `var(--navy-tint)`, 2 `var(--font-playfair)`)
- Modify: `components/admin/CategoriasTab.tsx` (1 `var(--navy)`, 1 `var(--font-playfair)`)
- Modify: `components/admin/ConfigTab.tsx` (1 `var(--navy)`, 1 `var(--font-playfair)`)
- Modify: `components/admin/LoginForm.tsx` (1 `var(--navy)`, 1 `var(--font-playfair)`)
- Modify: `components/admin/PedidosTab.tsx` (4 `var(--navy)`, 1 `var(--font-playfair)`)
- Modify: `components/admin/ProductEditor.tsx` (4 `var(--navy)`, 1 `var(--font-playfair)`)
- Modify: `components/admin/SalesTab.tsx` (5 `var(--navy)`, 1 `var(--gold-deep)`, 1 `var(--font-playfair)`)

**Interfaces:**
- Consumes: tokens da Task 1.

**IMPORTANTE — este task NÃO redesenha o admin.** É só trocar `var(--nome-antigo)` por `var(--nome-novo)` seguindo a mesma regra de decisão das tasks anteriores, mantendo cada elemento exatamente onde e como está — layout, estrutura de abas, formulários e comportamento intocados. O painel `/admin` deixa de quebrar visualmente (variáveis inexistentes) quando a Task 1 remover os nomes antigos de `:root`, e passa a herdar a paleta nova. Se a troca de um token deixar algum texto/botão com contraste ruim (ex: texto claro sobre fundo claro), ajuste só a escolha entre `--accent`/`--ink-soft`/`--ink` pra esse ponto — não redesenhe o componente.

- [ ] **Step 1: Achar as ocorrências em todos os 7 arquivos**

Run: `grep -rn "var(--navy\|var(--gold\|var(--font-playfair\|var(--font-montserrat" components/admin/`

- [ ] **Step 2: Atualizar cada arquivo**

Mesma regra de decisão: título/cabeçalho de painel e nomes de aba (`--font-playfair`) → `--font-serif`; botões, estado ativo de aba selecionada, badges de status (`--navy`, `--gold-deep`) → `--accent`/`--accent-deep`; texto estrutural, rótulos, ícones (`--navy`) → `--ink-soft`; fundo de linha desabilitada/placeholder (`--navy-tint`, em `AdminApp.tsx`) → `--surface-muted`.

- [ ] **Step 3: Verificar**

Run: `npm run build && npm run lint`
Expected: PASS.

Run: `grep -rn "var(--navy\|var(--gold\|var(--font-playfair\|var(--font-montserrat" components/admin/`
Expected: nenhuma linha.

- [ ] **Step 4: Smoke visual**

Matar processo na porta 3000, `npm run dev`, `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/admin` → 200 (tela de login, sem sessão). Matar o dev server.

- [ ] **Step 5: Commit**

```bash
git add components/admin/
git commit -m "chore: atualizar variáveis de cor do admin pro novo token (sem redesenho)"
```

---

## Task 7: Verificação final do repositório

**Files:**
- Nenhum arquivo novo — task só de verificação.

**Interfaces:**
- Consumes: o estado final de todas as tasks anteriores.

- [ ] **Step 1: Grep de zero ocorrências em todo o código-fonte**

Run: `grep -rn "var(--navy\|var(--gold\|var(--font-playfair\|var(--font-montserrat" app/ components/ lib/`
Expected: nenhuma linha (o `reference/` é ignorado de propósito — é a referência da Tânia, git-ignored e fora de escopo).

- [ ] **Step 2: Build, lint e testes**

Run: `npm run build`
Expected: PASS, sem erros.

Run: `npm run lint`
Expected: exit 0.

Run: `npm test`
Expected: todos os testes continuam verdes (nenhum teste depende de cor/fonte — se algum quebrar, é sinal de que alguma task saiu do escopo visual; investigar antes de prosseguir).

- [ ] **Step 3: Smoke visual das páginas principais**

Matar processo na porta 3000, `npm run dev`. Verificar (200 + visualmente coerente com a paleta nova — fundo rosado claro, botões pêssego, títulos em serifada) em:
`/`, `/carrinho`, `/checkout`, `/pedido/00000000-0000-0000-0000-000000000000` (deve dar 404, mas o **layout do 404** e o header/footer ao redor devem estar na paleta nova), `/minha-conta`, `/surpresa`, `/admin` (tela de login).
Matar o dev server ao final.

- [ ] **Step 4: Commit final (se houver ajustes)**

Se o Step 1 ou 3 revelar algo pendente, corrigir no arquivo correspondente e commitar normalmente. Se tudo já estava limpo, não há commit nesta task — só o registro de verificação no relatório.

---

## Self-Review

**Cobertura do spec:** paleta (Task 1) ✓, tipografia (Task 1) ✓, mapeamento de tokens (Global Constraints + regra de decisão aplicada em todas as tasks) ✓, aplicação por componente (Tasks 2-4) ✓, páginas (Task 5) ✓, admin mecânico (Task 6, explicitamente sem redesenho, conforme "fora de escopo: painel /admin — sub-projeto 2") ✓, verificação de build/lint/test + grep-zero (todas as tasks + Task 7 consolidada) ✓, logo como texto estilizado (nenhuma task cria arquivo de imagem de logo — consistente com "fora de escopo: arquivo gráfico do logo") ✓.

**Placeholder scan:** sem "TBD"/"implementar depois". Os exemplos de código dão o padrão exato (`background: esgotado ? ... : ...`) em vez de "similar ao anterior", porque esse trecho se repete literalmente nos dois arquivos da Task 4.

**Consistência de nomes:** os 12 tokens novos (`--bg`, `--surface`, `--surface-muted`, `--brand-pink`, `--ink`, `--ink-soft`, `--accent`, `--accent-deep`, `--muted`, `--line`, `--font-serif`, `--font-sans`) são usados com o mesmo nome em todas as 7 tasks — nenhuma task inventa um nome de token novo fora dessa lista.

## Execution Handoff

**Plano completo e salvo em `docs/superpowers/plans/2026-09-15-loja-lola-rebranding-vitrine.md`. Duas opções de execução:**

**1. Subagent-Driven (recomendado)** — um subagente novo por task, revisão entre tasks, iteração rápida.

**2. Inline Execution** — executo as tasks nesta sessão com `executing-plans`, em lotes com checkpoints de revisão.

**Qual abordagem?**
