# Loja LOLA — Dashboard do Admin (redesign visual + estrutural)

**Data:** 2026-09-21
**Status:** aprovado no brainstorming
**Escopo:** só o painel `/admin` (a dona da loja). O dashboard do
revendedor (atacado), também desenhado no mesmo canvas, **fica só como
design aprovado** — não é implementado nesta entrega; entra quando a
Fase 3 (atacado público) for construída.

## Contexto

O cliente rodou o comando `/design` (Claude Design canvas) com um
briefing baseado na Fase 1 + nas telas de admin já especificadas, usando
como referência solta um UI kit de dashboard de e-commerce do Figma. O
resultado — dois arquivos `.dc.html` de altíssima fidelidade (cores,
tipografia, espaçamento e interações finais) — foi entregue em
`design_handoff_lola_dashboards/` (README + `LOLA Admin Dashboard.dc.html`
+ `LOLA Revendedor Dashboard.dc.html`). Este spec traduz o handoff do
Admin para a arquitetura real do projeto (Next.js/React, RPCs
`admin_*`, `AdminApp.tsx` e as abas já existentes).

O admin atual (`components/admin/AdminApp.tsx` + `ProductEditor`,
`CategoriasTab`, `PedidosTab`, `SalesTab`, `ConfigTab`) é funcional mas
usa o visual antigo (herdado da Fase 1, só com os tokens de cor trocados
no rebranding anterior — sem redesenho estrutural). Esta entrega refaz a
estrutura visual (sidebar, cards, tabelas, gráfico, modais) seguindo o
canvas, mantendo toda a lógica de dados/RPCs já existente.

## Decisões

| Tema | Decisão |
|---|---|
| Escopo | Só o Admin. Revendedor fica documentado, não implementado. |
| Fidelidade | Alta — cores, tipografia, espaçamento e raios do canvas são finais; seguir literalmente (ver tokens abaixo). |
| Revendedores (aba nova) | Backend mínimo construído nesta entrega: tabela `revendedores` + RPCs `admin_list_revendedores`/`admin_set_revendedor_status`. Sem cadastro público ainda (isso é F3) — o admin cadastra manualmente por enquanto (ver RPC `admin_upsert_revendedor` abaixo). |
| "Repasses pendentes" (card Financeiro) | Sem conceito de repasse no schema ainda (é F3 — liquidação de revendedor). Fica com um valor placeholder fixo nesta entrega, com comentário `TODO(F3)` no código. Não bloqueia o resto do Financeiro. |
| Categorias | Sai da navegação principal — vira uma sub-aba dentro da tela **Produtos** (ex.: toggle "Produtos / Categorias" no topo da tela), já que uma só existe em função da outra. Mesma lógica/RPCs de `CategoriasTab.tsx`, só reembalada visualmente. |
| Config | Sai da navegação principal — vira um ícone de engrenagem no rodapé da sidebar, ao lado do card do usuário. Abre a tela de `ConfigTab.tsx` atual (trocar senha, taxa de entrega, WhatsApp), com o visual novo. |
| "Destaque" (toggle na tabela Produtos) | O canvas trata como toggle inline igual "Visível". Hoje o campo `products.destaque` só é setável via `admin_upsert_product` (edição completa) — precisa de uma RPC nova `admin_set_destaque(p_secret, p_id, p_destaque)`, espelhando `admin_set_ativo`. |
| "Live Surpresa" (`surpresa_ativo`) | Funcionalidade existente que **não estava no briefing do canvas** (gap descoberto ao comparar com `AdminApp.tsx` atual) — não pode ser removida. Ruling: entra como uma 9ª coluna "Live" na tabela de Produtos (mesmo padrão visual de toggle das colunas Visível/Destaque), usando a RPC já existente `admin_set_surpresa`. Sem mudança de comportamento (continua desativando os demais ao ativar um). |
| Logo | Placeholder de imagem no canvas (`image-slot`) — no código, mesmo padrão já usado na vitrine: texto estilizado em `var(--font-display)` (Bacony Script) até existir um arquivo de logo. |
| Ícones da sidebar | O canvas usa glifos provisórios (◆ ▤ ◇ ◈ ◎ 🛒 🔔 🔍). Substituir por uma biblioteca de ícones SVG real — o projeto não tem nenhuma instalada; usar `lucide-react` (leve, tree-shakeable, comum em projetos Next.js) com o glifo mais próximo semanticamente para cada item. |

## Tokens de design (novos, escopados ao admin)

O canvas usa uma paleta que estende a da vitrine com tons específicos de
dashboard (texto secundário mais escuro para tabelas densas, tints de
status). Esses tokens são **novos**, adicionados ao `:root` de
`app/globals.css` (mesmo arquivo da vitrine — são só mais custom
properties, não conflitam com nada existente) e usados só pelos
componentes do admin:

| Token | Valor | Papel |
|---|---|---|
| `--adm-text-secondary` | `#8A7A70` | texto secundário em tabelas/labels do admin (mais escuro que `--muted` da vitrine, pensado pra densidade de dashboard) |
| `--adm-success-bg` / `--adm-success-text` | `#EAFBF4` / `#2E7D63` | swing tag: Entregue, Pago, Aprovado |
| `--adm-purple-bg` / `--adm-purple-text` | `#F2ECFF` / `#6E56B8` | swing tag: Enviado, chip "Atacado", preço atacado na tabela de produtos |
| `--adm-orange-bg` / `--adm-orange-text` | `#FFF3E8` / `#C46A1F` | swing tag: Em preparação, Pendente; chip de desconto; item de nav ativo |
| `--adm-pink-bg` / `--adm-pink-text` | `#FFF0F4` / `#C4416F` | swing tag: Cancelado, Recusado; chip "Varejo"; alerta de estoque baixo |
| `--adm-trend-positive` | `#3FA383` | texto de tendência positiva nos KPIs |

Cores já existentes reaproveitadas do token global: `--bg` (#FDF6F3),
`--surface` (#FFFFFF), `--ink` (#2B2420), `--line` (#EFE0DB),
`--peach`/`--peach-deep` (CTA), `--pink`/`--mint`/`--lilac` (avatar
gradient do usuário). Tipografia: `--font-sans` (Hanken Grotesk — já é o
token global desde a recriação da Home) e `--font-mono` (Martian Mono —
idem) cobrem 100% do canvas sem precisar de fontes novas. `--font-display`
(Bacony Script) só no logo, igual à vitrine.

## Elemento-assinatura: swing tag nos status

Reaproveita o componente `SwingTag` já existente
(`components/SwingTag.tsx`) — mesma peça visual da vitrine, mas usada
**só em badges de status** no admin (nunca em preço, nunca em nav). A
função `tagStyle(status)`/cor por status do canvas mapeia direto para um
helper novo `lib/admin-status.ts`:

```ts
export function corStatus(status: string): { bg: string; text: string } {
  const map: Record<string, { bg: string; text: string }> = {
    "Entregue": { bg: "var(--adm-success-bg)", text: "var(--adm-success-text)" },
    "Aprovado": { bg: "var(--adm-success-bg)", text: "var(--adm-success-text)" },
    "Pago": { bg: "var(--adm-success-bg)", text: "var(--adm-success-text)" },
    "Enviado": { bg: "var(--adm-purple-bg)", text: "var(--adm-purple-text)" },
    "Em preparação": { bg: "var(--adm-orange-bg)", text: "var(--adm-orange-text)" },
    "Pendente": { bg: "var(--adm-orange-bg)", text: "var(--adm-orange-text)" },
    "Cancelado": { bg: "var(--adm-pink-bg)", text: "var(--adm-pink-text)" },
    "Recusado": { bg: "var(--adm-pink-bg)", text: "var(--adm-pink-text)" },
  };
  return map[status] ?? map["Pendente"];
}
```

`SwingTag` já suporta `color` (usado hoje com `var(--pink)` etc.) — os
status do admin passam `color={corStatus(label).bg}` e um novo prop
opcional (ou uma variante) pra cor de texto, já que hoje `SwingTag`
sempre usa `var(--ink)` como texto (correto pra vitrine, mas os status do
admin pedem texto colorido — `#2E7D63`, `#6E56B8` etc. — pra bater com o
canvas). **Ajuste em `SwingTag.tsx`:** adicionar prop opcional `textColor`
(default `"var(--ink)"`, preservando o comportamento atual em todos os
usos existentes na vitrine).

## Layout geral

- **Sidebar** fixa 232px, branca, borda direita `--line`, padding
  24px/16px. Logo (texto Bacony Script) + rótulo mono "ADMIN". Nav:
  ícone 20px + label 14px/500, padding 10/12, raio 10px. Item ativo:
  fundo `--adm-orange-bg`, texto `--adm-orange-text`. Card do usuário
  fixo no rodapé (nome + "Dona da loja" — usar `admin_config` ou um nome
  fixo por enquanto, não há multi-usuário no schema) + ícone de
  engrenagem (Config) ao lado.
- **Header** branco: título + subtítulo da tela à esquerda; busca (só
  visual por enquanto — sem busca funcional no escopo) + sino (visual,
  sem notificações reais) à direita.
- **Conteúdo**: `padding: 28px 32px 40px`, grids
  `repeat(auto-fit,minmax(…,1fr))` pra reflow, tabelas com
  `overflow-x:auto` + `min-width` (mesmo padrão já usado na vitrine).
- Mobile: fora do escopo desta entrega (o canvas mostra uma versão
  mobile da Visão geral só como referência de design; o admin de fato é
  usado em desktop pela dona da loja — se isso mudar, é um pedido novo).

## Telas

### 1. Visão geral (nova)

Não existe hoje — é uma tela nova. Consome:
- `admin_list_sales('todos'|'varejo'|'atacado')` para os 3 KPIs (Vendas
  totais, Vendas do mês, Nº de vendas) — soma/filtra no client a partir
  da lista já retornada (sem RPC de agregação nova).
- Gráfico "Vendas no tempo" (12 meses): agrega `sales.data`/`valor_total`
  por mês no client, mesmo approach. SVG com `<path>` de linha + área
  com gradiente (`--pink` 22%→0%), exatamente como o canvas.
- "Revendedores pendentes" (até 3, com ✓/✕ inline): `admin_list_revendedores('pendente')`.
- "Pedidos aguardando ação": `admin_list_orders('todos')` filtrado por
  `status === 'preparando'` no client.
- "Estoque baixo": `admin_list_products` filtrado por `totalEstoque(p) <= 5`
  no client (reaproveita `totalEstoque` de `lib/types.ts`).
- Segmentado Todos/Varejo/Atacado no topo — mesmo padrão de filtro já
  usado em Pedidos/Financeiro hoje.

### 2. Pedidos (redesign visual)

Mesma lógica de `PedidosTab.tsx` (filtro, `admin_list_orders`,
`admin_update_order_status`) — só a tabela e os filtros mudam de visual
pra bater com o canvas (colunas: Pedido, Cliente/Revendedor, Tipo,
Itens, Valor, Entrega como swing tag, Data). "Revendedor" abaixo do nome
do cliente quando `order.is_atacado` — usa `order.cliente_nome` (já
é o texto informado, não precisa de join com `revendedores` para isso).

### 3. Produtos (redesign visual + sub-aba Categorias + toggle Destaque)

Mesma lógica de listagem/edição (`ProductEditor.tsx` continua sendo o
modal/tela de edição completa) — a LISTAGEM em tabela ganha o visual do
canvas (foto 44px, colunas Produto/Categoria/Varejo/Atacado/Estoque/
Visível/Destaque/Desconto). Botão "+ Cadastrar produto" abre o mesmo
fluxo de criação já existente (via `ProductEditor`, não um modal novo
raso como o canvas mockou — o canvas simplifica pra prototipagem, mas o
projeto já tem um editor completo com cores/tamanhos/imagens que não
pode ser substituído por um modal de 6 campos). Toggle "Destaque" chama
a RPC nova `admin_set_destaque`. Sub-aba "Categorias" no topo da tela
troca pra `CategoriasTab.tsx` com visual atualizado.

### 4. Financeiro (redesign visual)

Mesma lógica de `SalesTab.tsx` (`admin_list_sales`, `admin_insert_sale`,
`admin_delete_sale`) — 4 cards no topo:
- **Receita total**: soma de `valor_total` das vendas do filtro atual.
- **A receber (Atacado)**: `sales.status` já existe como texto livre
  (`default 'aprovado'`) — soma de `valor_total` onde `is_atacado = true`
  e `status <> 'aprovado'` (qualquer lançamento atacado ainda não
  liquidado). Dado real, sem `TODO`.
- **Ticket médio**: receita total / nº de vendas do filtro atual.
- **Repasses pendentes**: sem conceito no schema — placeholder fixo
  (`0`, não um número inventado tipo "7" do canvas) com comentário
  `TODO(F3): repasse de revendedor`.

Tabela de lançamentos com visual novo. "+ Lançamento manual" abre o
modal já existente (`admin_insert_sale`), com visual atualizado.

### 5. Revendedores (nova, backend mínimo novo)

**Schema novo** (`supabase/migrations/0004_revendedores.sql`):

```sql
create table revendedores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cidade text not null,
  status revendedor_status not null default 'pendente', -- enum já existe
  created_at timestamptz not null default now()
);
alter table revendedores enable row level security;
-- Sem policy de SELECT pública: acesso só via RPC SECURITY DEFINER, igual ao resto do admin.
```

**RPCs novas** (`0002_functions.sql`, mesmo padrão `p_secret` das demais):
- `admin_list_revendedores(p_secret, p_status default 'todos')` — retorna
  todos ou filtrados por status.
- `admin_set_revendedor_status(p_secret, p_id, p_status)` — aprova/recusa.
- `admin_upsert_revendedor(p_secret, p_id, p_nome, p_cidade)` — cadastro
  manual (o canvas não previa isso porque assumia autoatendimento da F3;
  sem ele a aba fica sem dado real pra popular agora). Botão
  "+ Cadastrar revendedor" adicionado à tela (fora do canvas, mas
  necessário pra aba funcionar de verdade antes da F3).

Tela: tabela Loja/Cidade/Solicitado/Status/Ações. Status pendente mostra
swing tag "Cadastro pendente" + botões Aprovar/Recusar; decidido mostra
só texto discreto "Aprovado"/"Recusado" (idêntico ao canvas).

## Componentes novos

- `components/admin/AdminSidebar.tsx` — sidebar com nav, logo, card do
  usuário, ícone de config.
- `components/admin/VisaoGeralTab.tsx` — tela nova (seção acima).
- `components/admin/RevendedoresTab.tsx` — tela nova.
- `components/admin/AdminKpiCard.tsx`, `AdminTable.tsx` (ou equivalente)
  — se ao implementar ficar claro que os cards/tabelas se repetem
  idênticos entre telas, extrair como componentes compartilhados (deixar
  a decisão exata pro plano/implementação, seguindo DRY sem
  over-engineering).

## Componentes reestilizados (mesma lógica, visual novo)

`AdminApp.tsx` (troca o esquema de tabs por navegação de sidebar + rotas
internas), `PedidosTab.tsx`, `ProductEditor` (lista), `CategoriasTab.tsx`,
`SalesTab.tsx`, `ConfigTab.tsx`.

## Fora de escopo

- Dashboard do revendedor (atacado) — design aprovado, implementação
  fica pra Fase 3.
- Busca funcional no header, notificações reais no sino.
- Cadastro público de revendedor (F3) — só cadastro manual pelo admin
  nesta entrega.
- "A receber (Atacado)" e "Repasses pendentes" com dado 100% real, se o
  conceito de liquidação não existir no schema — marcados `TODO(F3)`
  onde necessário, sem bloquear o resto.
- Versão mobile do admin.

## Testes / verificação

- `npm run build`, `npm test`, `npm run lint` continuam obrigatórios.
- Migração nova testada localmente (Supabase) antes de aplicar em
  produção — mesmo processo já usado nas migrações anteriores.
- Checagem visual manual (dev server, senha de admin) de cada tela —
  feita pelo controller/usuário.
- Contraste: `--adm-*-text` sobre `--adm-*-bg` já são pares definidos
  pelo canvas (alto contraste por design — status coloridos sempre em
  fundo claro do mesmo matiz) — não repetir o erro do rebranding
  anterior (texto claro sobre fundo saturado); aqui os fundos já são
  tints claros, então o texto escuro do próprio tom funciona.
