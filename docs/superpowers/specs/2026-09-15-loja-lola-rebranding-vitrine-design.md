# Loja LOLA — Rebranding visual, sub-projeto 1 (Vitrine)

**Data:** 2026-09-15
**Status:** aprovado no brainstorming
**Escopo:** só a loja de varejo (vitrine, produto, carrinho, checkout, pedido,
minha-conta, surpresa, chrome — Header/Footer/TrustStrip). O painel `/admin`
é um **sub-projeto 2, separado**, com seu próprio brainstorming depois desta
entrega.

## Contexto

A marca LOLA vai passar por um rebranding visual pra ficar com uma "vibe mais
jovem". O código atual (Fase 1) usa a paleta provisória neutra/navy herdada
da referência de arquitetura (loja Tânia). Esta troca é **só visual** — nenhuma
página, rota, componente estrutural, RPC ou fluxo muda de comportamento.
`npm run build` / `npm test` / `npm run lint` continuam sendo os mesmos
critérios de verde.

## Decisões

| Tema | Decisão |
|---|---|
| Escopo | Só estilo (cores, tipografia, espaçamento, tratamento visual dos componentes). Mesma estrutura de páginas/seções da Fase 1. |
| Logo | Continua **texto estilizado** (`BRAND.nome` em Fraunces) — não é um arquivo gráfico agora. O TODO já deixado no código pra trocar por `<img>` segue valendo pra quando houver um arquivo final de logo. |
| Paleta | Base rosa-poeira + marrom-oliva (do logo atual da marca) + um pop de laranja-pêssego como destaque (de uma paleta de referência "Bright Pastels"). Ver tabela de tokens abaixo. |
| Tipografia | Fraunces (serifada, títulos/logo) + Plus Jakarta Sans (sans, texto/UI), no lugar de Playfair Display + Montserrat. |
| Nomes das variáveis CSS | Renomeadas pra refletir a semântica nova (`--navy` não faz mais sentido numa paleta rosa/pêssego). Ver mapeamento abaixo. |

## Paleta — novos tokens (`app/globals.css` `:root`)

| Token | Valor | Papel |
|---|---|---|
| `--bg` | `#FDF6F3` | fundo geral (branco levemente rosado) |
| `--surface` | `#FFFFFF` | cards, header, superfícies elevadas |
| `--surface-muted` | `#F5EFEC` | estados neutros (esgotado, skeleton de loading, swatch vazio) — substitui o antigo `--navy-tint` |
| `--brand-pink` | `#F3C4C6` | faixas de destaque, seções, badges de marca |
| `--ink` | `#2B2420` | texto de corpo, títulos fortes, superfícies escuras (substitui `--navy-deep` onde era fundo escuro) |
| `--ink-soft` | `#6B5B4E` | logo/títulos decorativos, elementos estruturais que eram `--navy` mas não são botão/CTA (nav, headers, texto de marca) |
| `--accent` | `#FFB069` | botões (Comprar, Finalizar), preços em destaque, seleção ativa (tamanho/cor escolhidos), badges de promoção — substitui `--navy` nos usos de botão/CTA e `--gold` |
| `--accent-deep` | `#E8944A` | hover/estado ativo do destaque — substitui `--navy-deep`/`--gold-deep` nos mesmos contextos |
| `--muted` | `#8C8079` | texto secundário (mesmo papel de hoje, valor novo) |
| `--line` | `#EFE0DB` | bordas, divisórias (mesmo papel de hoje, valor novo) |
| `--font-serif` | `"Fraunces", serif` | títulos, logo — substitui `--font-playfair` |
| `--font-sans` | `"Plus Jakarta Sans", -apple-system, sans-serif` | corpo, UI — substitui `--font-montserrat` |

**Mapeamento dos tokens antigos → novos** (usado como guia; a aplicação é
por componente, não um find-replace cego, porque `--navy` e `--gold` hoje
cobrem papéis diferentes conforme o contexto):

- `--navy` (65 usos) → **majoritariamente `--accent`** nos usos de botão/CTA/estado
  selecionado (é o caso mais comum: `.btn`, swatch de tamanho ativo, badge do
  carrinho); **`--ink-soft`** nos usos estruturais que são texto/nav/marca, não
  interação (ex: link de navegação, texto do header).
- `--navy-deep` (1 uso, fundo escuro) → `--ink`.
- `--navy-tint` (11 usos, fundo neutro pra estado esgotado/loading) → `--surface-muted`.
- `--gold` / `--gold-deep` (12 usos, já era o destaque secundário) → `--accent` / `--accent-deep`.
- `--ink`, `--muted`, `--line`, `--surface`, `--bg` (nomes mantidos, valores novos).

**Regra de verificação:** ao final da troca, `grep -rn "var(--navy\|var(--gold"`
em `app/` e `components/` deve retornar **zero linhas**. Esse é o portão de
qualidade — substitui checagem visual exaustiva de cada componente.

## Tipografia — carregamento

`app/layout.tsx` troca o `<link>` do Google Fonts:
`Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700` +
`Plus+Jakarta+Sans:wght@400;500;600;700` (pesos exatos a ajustar pelo
implementador conforme o que cada componente usa hoje — checar os `fontWeight`
inline atuais antes de fixar a lista de pesos, pra não carregar peso demais
nem faltar um usado).

## Aplicação nos componentes principais (referência, não exaustiva)

- **Header** — fundo `--surface`, "LOLA" em `--font-serif` cor `--ink-soft`,
  nav em `--font-sans`, badge do carrinho em `--accent`.
- **HeroCarousel / faixa da home** — placeholder de banner com fundo
  `--brand-pink`, título em `--font-serif`.
- **ProductCard** — fundo `--surface`, nome em `--font-sans`, preço em
  `--accent`, borda `--line`, selo de destaque em `--brand-pink`.
- **TrustStrip / PaymentsFooter** — fundo `--brand-pink` claro ou `--bg`,
  ícones em `--ink-soft`.
- **Botões (`.btn`, `.btn-outline`)** — fundo `--accent`, hover `--accent-deep`.
- **ProductDetail / SurpresaOffer** — swatch de tamanho selecionado em
  `--accent`, esgotado em `--surface-muted`.
- **Admin** — fora de escopo aqui (sub-projeto 2); as classes/tokens
  compartilhados (`.btn`, cores globais) herdam a troca automaticamente, mas
  o layout/estrutura do painel não é tocado nesta entrega.

## Fora de escopo

- Arquivo gráfico do logo (segue como texto estilizado até o cliente ter um
  arquivo final).
- Redesenho estrutural/layout (grid de filtros, novo header, nova
  organização de seções) — é só reskin.
- Painel `/admin` — sub-projeto 2, brainstorming próprio depois desta entrega.
- Imagens de produto/hero reais — a vitrine continua com os placeholders
  "Espaço reservado" até haver fotos.

## Testes / verificação

- `npm run build`, `npm test`, `npm run lint` continuam obrigatoriamente
  verdes — nenhum teste existente depende de cor/fonte, então não deveriam
  quebrar; se algum snapshot ou asserção quebrar, é sinal de que a mudança
  saiu do escopo visual.
- Grep de zero ocorrências de `var(--navy`, `var(--gold`, `Playfair`,
  `Montserrat` fora de comentários históricos, ao final de cada task.
- Checagem visual manual (dev server) das páginas principais: vitrine, PDP,
  carrinho, checkout, pedido — feita pelo controller/usuário, não é um teste
  automatizado.
