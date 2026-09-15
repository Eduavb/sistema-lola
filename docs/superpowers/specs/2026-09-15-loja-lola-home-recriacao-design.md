# Loja LOLA — Recriação visual, sub-projeto 1 (Home)

**Data:** 2026-09-15
**Status:** aprovado no brainstorming
**Escopo:** recriação visual da **Home** (`app/page.tsx`) e do chrome
compartilhado (`Header`, `TrustStrip`, `PaymentsFooter`/`SiteFooter`) — o
chrome é compartilhado por todas as páginas da vitrine, então essa troca
aparece em todas elas mesmo antes delas serem redesenhadas. O corpo das
outras páginas (produto, carrinho, checkout, pedido, minha-conta,
surpresa) fica com o **conteúdo** e **estrutura interna** como estão
hoje (herdam só os tokens de cor/tipografia globais) — é um **sub-projeto
2, separado**, que vem depois deste. O painel `/admin` é um **sub-projeto
3**, também separado, com sua própria referência (dashboard Figma) — vem
por último.

## Contexto

O rebranding anterior (`2026-09-15-loja-lola-rebranding-vitrine-design.md`,
já entregue) trocou só cores/tipografia, mantendo a mesma estrutura de
seções da Fase 1. O cliente pediu agora para **recriar o layout do zero**,
mais jovem, usando como referência solta um UI kit de e-commerce de moda
("Cloth Store — Fashion Store — E-commerce UI Kit", Figma Community) e
pedindo fontes mais vibrantes e uma paleta "Bright Pastels" repensada, pra
transmitir **jovialidade e harmonia**.

A referência do Figma foi inspecionada (screenshots via MCP): fundo com
textura de papel/grão, tipografia display gigante e condensada, grid de
fotos editoriais assimétrico, nav em formato pill, chips de filtro retos,
rodapé com wordmark gigante. A LOLA adapta essa **estrutura** (textura,
escala tipográfica, colagem assimétrica, pills) para o próprio universo
visual — pastéis vívidos, tom mais macio/arredondado — não uma cópia
literal em tons de cinza.

## Decisões

| Tema | Decisão |
|---|---|
| Escopo | Home + chrome compartilhado (Header/TrustStrip/Footer). Recriação estrutural real (novo layout de seções), não só reskin. |
| Ordem | Sub-projeto 1 (este) → sub-projeto 2 (resto da vitrine) → sub-projeto 3 (admin, referência de dashboard). |
| Imagens | Continuam placeholders ("espaço reservado") — sem fotos reais ainda. Placeholders ganham tratamento mais editorial (textura, moldura), não só um retângulo cinza. |
| Logo | Continua texto estilizado (mesma regra do rebranding anterior). |
| Figma | Referência solta (estrutura/composição), não replicação literal — cores/tom são da LOLA. |

## Paleta — novos tokens (`app/globals.css` `:root`)

Repensada a partir da referência "Bright Pastels": uma família de pastéis
vívidos que convivem (harmonia = várias cores com função clara, não uma
cor só de destaque). Cada tom secundário é também o código de cor de um
grupo de categoria — usado nos chips de categoria e nos swing-tags de
produto daquele grupo.

| Token | Valor | Papel |
|---|---|---|
| `--bg` | `#FFF8F1` | fundo geral (papel quente) |
| `--surface` | `#FFFFFF` | cards, header, superfícies elevadas |
| `--surface-muted` | `#F5ECE2` | estados neutros (esgotado, skeleton, placeholder) |
| `--ink` | `#2B2420` | texto de corpo, títulos fortes |
| `--ink-soft` | `#6B5B4E` | textos secundários estruturais (nav, legendas) |
| `--muted` | `#8C8079` | texto secundário |
| `--line` | `#EFE0D6` | bordas, divisórias |
| `--pink` | `#FF8FAB` | acento categoria "calçados" (tênis/sapatilha), badges de marca |
| `--pink-deep` | `#F2678F` | hover/estado ativo de `--pink` |
| `--mint` | `#8FE3C8` | acento categoria "sandálias" |
| `--mint-deep` | `#5FCBA9` | hover/estado ativo de `--mint` |
| `--lilac` | `#C7A8FF` | acento categoria "sapatilhas" (reserva/expansão futura) |
| `--lilac-deep` | `#A87EF0` | hover/estado ativo de `--lilac` |
| `--peach` | `#FFA45C` | acento categoria "bolsas"/acessórios, CTA principal (Comprar, Finalizar) |
| `--peach-deep` | `#E8823A` | hover/estado ativo de `--peach`, preço em destaque |
| `--font-display` | `"Bricolage Grotesque", sans-serif` | títulos, headline, logo — substitui `--font-serif` (Fraunces) |
| `--font-sans` | `"Onest", -apple-system, sans-serif` | corpo, UI — substitui `--font-sans` (Plus Jakarta Sans) |
| `--font-mono` | `"Space Mono", monospace` | preços, tags de categoria, labels de filtro (efeito etiqueta) |

**Mapeamento de categoria → cor** (`lib/brand.config.ts` ganha um mapa
novo, `CATEGORIA_COR`, usado por `CategoryChips` e `ProductCard`):
- grupo `calcados`, categoria contém "tênis" ou é a primeira do grupo → `--pink`
- categoria contém "sandália" → `--mint`
- categoria contém "sapatilha" → `--lilac`
- grupo `acessorios` (bolsas) → `--peach`
- fallback (categoria não mapeada) → `--peach`

**Regra de verificação:** ao final, `grep -rn "var(--brand-pink\|var(--accent\b\|Fraunces\|Plus Jakarta" app/ components/`
deve retornar zero linhas (fora de comentários históricos) — confirma que
os tokens antigos do rebranding anterior foram totalmente substituídos
pelos novos.

## Tipografia — carregamento

`app/layout.tsx` troca o `<link>` do Google Fonts pelos três novos:
- `Bricolage+Grotesque:opsz,wght@12..96,400..800`
- `Onest:wght@400;500;600;700`
- `Space+Mono:wght@400;700`

(Pesos exatos a confirmar pelo implementador olhando o `fontWeight`
inline que cada componente novo usa, igual foi feito no rebranding
anterior.)

## Elemento-assinatura: swing tag (etiqueta de sapato)

Componente novo `components/SwingTag.tsx` — reproduz visualmente a
etiqueta física pendurada num calçado: retângulo com um canto cortado ou
furo simulado (`::before` circular) e uma "cordinha" (linha curva via
`border` ou pseudo-elemento), levemente rotacionado (`transform: rotate(-4deg)`),
fonte `var(--font-mono)` maiúscula com tracking. Recebe `color` (uma das
cores de categoria) e o conteúdo (preço, texto).

Usos:
- `ProductCard`: o preço vira um `SwingTag` na cor da categoria do produto,
  ancorado no canto da imagem.
- `HeroCarousel`/hero da home: um `SwingTag` maior "pendurado" perto do
  headline, com o texto da estação/coleção.
- `CategoryChips` (componente novo): cada categoria é um `SwingTag`
  clicável que rola até a seção correspondente — mesma peça visual,
  reaproveitada como navegação.

Esse é o único elemento com esse tratamento (rotação, furo, cordinha) —
o resto da UI fica com bordas retas/arredondadas discretas (`border-radius`
pequeno, 8–12px), pra manter o "sotaque" concentrado no swing tag e não
diluir a assinatura.

## Layout — Home (`app/page.tsx`)

```
┌──────────────────────────────────────────────┐
│ [≡] LOLA      Calçados  Acessórios  Conta [🛍]│  Header — nav em pill
├──────────────────────────────────────────────┤
│  Hero: bloco com textura de papel/grão        │
│  "NOVA COLEÇÃO"  (display gigante)            │
│  🏷 Verão 2026  (swing tag pendurado)          │
│  [placeholder A]      [placeholder B, offset] │
│                                    [Ver loja →]│
├──────────────────────────────────────────────┤
│ TrustStrip (chips arredondados, cor peach)    │
├──────────────────────────────────────────────┤
│ DESTAQUES →           [card][card][card][card]│
├──────────────────────────────────────────────┤
│ 🏷tênis 🏷bolsas 🏷sandália 🏷sapatilha         │  CategoryChips (swing tags)
├──────────────────────────────────────────────┤
│ Calçados            [card][card][card][card]  │
├──────────────────────────────────────────────┤
│ Acessórios          [card][card][card][card]  │
├──────────────────────────────────────────────┤
│  colagem assimétrica de 3 placeholders +      │
│  frase de marca ("feito pra combinar com      │
│  você" — copy final a definir na implementação)│
├──────────────────────────────────────────────┤
│ PaymentsStrip (Pix · Cartão · Checkout MP)    │
├──────────────────────────────────────────────┤
│           LOLA   (wordmark gigante)           │
│  Coleção · Atendimento · © ano LOLA           │
└──────────────────────────────────────────────┘
```

Novo componente `components/BrandStory.tsx` (a colagem + frase de marca),
inserido entre as seções de produto e o rodapé de pagamento em
`app/page.tsx`. Usa 3 placeholders em alturas diferentes (`translateY`
alternado) pra reproduzir a colagem assimétrica da referência, e um H2 em
`var(--font-display)` com a frase de marca.

## Componentes tocados

- **`app/globals.css`** — tokens novos (seção acima), classes utilitárias
  novas: `.swing-tag`, `.pill-nav`, `.chip-category`, escala tipográfica
  (`--h1`..`--h4`) usando `clamp()` pra manter a hierarquia grande/ousada
  da referência responsiva.
- **`app/layout.tsx`** — troca de fontes (seção acima).
- **`components/SwingTag.tsx`** *(novo)* — componente do elemento-assinatura.
- **`components/CategoryChips.tsx`** *(novo)* — navegação por categoria
  usando `SwingTag`, lê os grupos/categorias já carregados em `app/page.tsx`
  (mesma fonte de dados de `agruparPorCategoria`, sem nova query).
- **`components/BrandStory.tsx`** *(novo)* — colagem + frase de marca.
- **`components/Header.tsx`** — reestruturado: barra superior (tagline)
  simplificada ou removida a favor de um único header em pill; logo em
  `var(--font-display)`; ícone do carrinho ganha o badge em `--peach`
  (mantém contrato: nenhuma prop muda, `useCart()` continua a mesma fonte).
- **`components/HeroCarousel.tsx`** — o modo "sem imagem" (placeholder)
  ganha o tratamento de textura + swing tag; a prop `HeroSlide` não muda
  de forma (mantém `src`, `alt`, `placeholderLabel`, etc.) — só o visual
  do placeholder e o wrapper. Modo "com imagem" (`s.src` truthy) mantém o
  comportamento atual (carrossel automático, dots, `prefers-reduced-motion`),
  só troca cores/fontes dos elementos ao redor.
- **`components/ProductCard.tsx`** — preço vira `SwingTag`; badge de
  destaque também usa o vocabulário de cores por categoria.
- **`components/TrustStrip.tsx`** — visual em chips arredondados na cor
  `--peach`, mesmo conteúdo/estrutura de dados (`ITEMS`).
- **`components/PaymentsFooter.tsx`** — `SiteFooter` ganha o wordmark
  gigante `LOLA` (`var(--font-display)`, tamanho `clamp(64px,14vw,180px)`)
  antes do bloco de copyright; `PaymentsStrip` só troca visual.
- **`app/page.tsx`** — adiciona `CategoryChips` depois do `TrustStrip` e
  `BrandStory` antes do `PaymentsStrip`; resto da estrutura (seções por
  categoria, `EmptyGrid`, `GrupoSection`) mantém a mesma lógica de dados.
- **`lib/brand.config.ts`** — adiciona `CATEGORIA_COR` (mapa de regra de
  cor por categoria, descrito acima).

## Motion

- Hero placeholder e `BrandStory`: fade/slide sutil de entrada ao rolar a
  página até a seção (`IntersectionObserver` simples ou CSS
  `@starting-style`/`animation` com `prefers-reduced-motion` respeitado —
  mesmo padrão já usado no carrossel hoje).
- Swing tag: pequena rotação/hover (`transform: rotate(-4deg) -> -2deg`)
  ao passar o mouse nos cards — reforça a metáfora de "etiqueta balançando"
  sem exagerar.
- Sem scroll-jacking, sem parallax pesado — a "recriação" é da composição
  visual, não uma demo de efeitos.

## Fora de escopo

- Fotos de produto/hero reais — placeholders continuam.
- Arquivo gráfico do logo.
- Conteúdo/estrutura interna de PDP, carrinho, checkout, pedido,
  minha-conta, surpresa — sub-projeto 2.
- Painel `/admin` — sub-projeto 3, com a referência de dashboard.
- Novo copy definitivo de marketing (frase da `BrandStory`, textos do
  hero) — o implementador escreve um texto plausível seguindo o tom
  "jovem, harmonioso" da marca; o cliente pode trocar depois pelo texto
  final sem mudar estrutura.

## Testes / verificação

- `npm run build`, `npm test`, `npm run lint` continuam obrigatoriamente
  verdes.
- Nenhum teste existente depende de estrutura visual da Home — se algum
  quebrar, é sinal de que a mudança tocou lógica de dados além do previsto
  aqui.
- Grep de zero ocorrências de `var(--brand-pink`, `var(--accent`, `Fraunces`,
  `Playfair`, `Montserrat`, `Plus Jakarta` fora de comentários históricos,
  ao final da implementação.
- Checagem visual manual (dev server) da Home em desktop e mobile
  (≤ 400px) — feita pelo controller/usuário, não é teste automatizado.
- Acessibilidade: contraste de texto sobre `--pink`/`--mint`/`--lilac`/`--peach`
  verificado manualmente (WCAG AA) antes de fechar a tarefa que introduz
  cada uso — mesma lição do rebranding anterior, onde texto claro sobre
  `--accent` falhou contraste.
