# Loja LOLA — Dashboard do Admin — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesenhar o painel `/admin` (sidebar, 6 telas, tabela de
produtos, Financeiro, Pedidos) seguindo o canvas de design de alta
fidelidade, mantendo 100% da lógica/RPCs existentes, e adicionar a nova
aba Revendedores com backend mínimo (tabela + RPCs).

**Architecture:** Next.js App Router, componentes React client-side já
existentes (`AdminApp.tsx` + abas) trocam de esquema de tabs-no-topo
para sidebar fixa + telas. Toda mutação continua passando pelas RPCs
`SECURITY DEFINER` via `app/admin/actions.ts` (server actions) — nenhum
acesso direto a tabela. Estado (`useState`) continua no `AdminApp.tsx`
como hoje; as telas recebem dados via props, iguais ao padrão atual.

**Tech Stack:** Next.js 16, TypeScript, React 19, Supabase (Postgres +
RPCs), `lucide-react` (ícones — nova dependência, ver Task 2).

**Spec:** `docs/superpowers/specs/2026-09-21-loja-lola-admin-dashboard-design.md`

## Global Constraints

- `npm run build`, `npm run lint`, `npm test` continuam obrigatórios ao
  final de cada task.
- **Nenhuma mudança na vitrine** (`app/page.tsx`, `app/produto`,
  `app/carrinho`, `app/checkout`, `app/pedido`, `app/minha-conta`,
  `app/surpresa`, `components/Header.tsx`, `components/HeroCarousel.tsx`,
  `components/ProductCard.tsx`, `components/TrustStrip.tsx`,
  `components/PaymentsFooter.tsx`, `components/CategoryChips.tsx`,
  `components/BrandStory.tsx`) — este plano só toca `/admin` e (por
  causa do prop novo do `SwingTag`) `components/SwingTag.tsx`, que é
  aditivo e não pode mudar o comportamento visual dos usos já existentes
  na vitrine.
- Tokens novos (`--adm-*`) são **aditivos** em `app/globals.css` — não
  remove nem edita nenhum token existente.
- Toda mutação (toggle, aprovar/recusar, salvar) passa por
  `app/admin/actions.ts` → RPC `SECURITY DEFINER` com `assert_admin`,
  igual ao padrão 100% já usado no arquivo. Nunca query direta a tabela
  do admin.
- Toda função SQL nova usa `set search_path = public, extensions`
  (pgcrypto vive em `extensions` no Supabase — lição já aprendida na
  Fase 1; esquecer isso quebra em produção mesmo passando local).
- Cores exatas do canvas (hex) são finais — usar os tokens `--adm-*`
  definidos na Task 2, não reinventar valores.
- Cada tela mantém **toda** a interatividade que já existe hoje mesmo
  quando o canvas não mostrava esse detalhe (ex.: expandir pedido pra
  ver itens/endereço, "Marcar como pago", select de status, toggle Live
  Surpresa) — o canvas é referência visual de alta fidelidade pra
  cores/tipografia/espaçamento, não uma reescrita funcional.

---

### Task 1: Migração e RPCs — Revendedores + `admin_set_destaque`

**Files:**
- Create: `supabase/migrations/0004_revendedores.sql`
- Modify: `app/admin/actions.ts`

**Interfaces:**
- Produz (consumido pela Task 6): `fetchRevendedores(status?)`,
  `setRevendedorStatus(id, status)`, `upsertRevendedor(payload)`.
- Produz (consumido pela Task 7): `setDestaque(id, destaque)`.

- [ ] **Passo 1: Criar a migração**

```sql
-- 0004_revendedores.sql
-- Backend mínimo da aba Revendedores do admin. Sem cadastro público
-- ainda (isso é Fase 3) — só CRUD manual pelo admin por enquanto.

create table revendedores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cidade text not null,
  status revendedor_status not null default 'pendente',
  created_at timestamptz not null default now()
);
alter table revendedores enable row level security;
-- Sem policy de SELECT pública — acesso só via RPC SECURITY DEFINER.

create or replace function admin_list_revendedores(p_secret text, p_status text default 'todos')
returns jsonb language plpgsql security definer set search_path = public, extensions stable as $$
begin
  perform assert_admin(p_secret);
  return coalesce((
    select jsonb_agg(to_jsonb(r) order by
      case r.status when 'pendente' then 0 else 1 end, r.created_at desc)
    from revendedores r
    where (p_status = 'todos' or p_status is null or r.status::text = p_status)
  ), '[]'::jsonb);
end $$;

create or replace function admin_set_revendedor_status(p_secret text, p_id uuid, p_status revendedor_status)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  perform assert_admin(p_secret);
  update revendedores set status = p_status where id = p_id;
  if not found then raise exception 'revendedor não encontrado'; end if;
end $$;

create or replace function admin_upsert_revendedor(p_secret text, p_id uuid, p_nome text, p_cidade text)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid;
begin
  perform assert_admin(p_secret);
  if p_nome is null or trim(p_nome) = '' then raise exception 'nome obrigatório'; end if;
  if p_id is null then
    insert into revendedores(nome, cidade) values (trim(p_nome), coalesce(trim(p_cidade),''))
    returning id into v_id;
  else
    update revendedores set nome = trim(p_nome), cidade = coalesce(trim(p_cidade),'')
    where id = p_id returning id into v_id;
    if v_id is null then raise exception 'revendedor não encontrado'; end if;
  end if;
  return v_id;
end $$;

create or replace function admin_set_destaque(p_secret text, p_id uuid, p_destaque boolean)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  perform assert_admin(p_secret);
  update products set destaque = p_destaque where id = p_id;
end $$;
```

- [ ] **Passo 2: Aplicar a migração no Supabase local/dev**

Use o fluxo já estabelecido no projeto para aplicar migrações (mesmo
processo das migrações anteriores — `supabase/migrations/0001..0003`).
Confirme que as 4 funções e a tabela `revendedores` existem antes de
seguir.

- [ ] **Passo 3: Adicionar as novas server actions em `app/admin/actions.ts`**

Seguir exatamente o padrão de `fetchOrders`/`setAtivo`/`saveCategoria`
já no arquivo (mesma função `getSecret()`, mesmo formato de retorno
`{ error? }`/`{ error?; id? }`). Adicionar ao final do arquivo:

```ts
export type Revendedor = {
  id: string;
  nome: string;
  cidade: string;
  status: "pendente" | "aprovado" | "recusado";
  created_at: string;
};

export async function fetchRevendedores(
  p_status: string = "todos"
): Promise<Revendedor[]> {
  const secret = await getSecret();
  if (!secret) return [];
  const { data, error } = await supabase().rpc("admin_list_revendedores", {
    p_secret: secret,
    p_status,
  });
  if (error) return [];
  return (data ?? []) as Revendedor[];
}

export async function setRevendedorStatus(
  id: string,
  status: "pendente" | "aprovado" | "recusado"
): Promise<{ error?: string }> {
  const secret = await getSecret();
  if (!secret) return { error: "Não autenticado." };
  const { error } = await supabase().rpc("admin_set_revendedor_status", {
    p_secret: secret,
    p_id: id,
    p_status: status,
  });
  if (error) return { error: error.message };
  return {};
}

export async function upsertRevendedor(payload: {
  id: string | null;
  nome: string;
  cidade: string;
}): Promise<{ error?: string; id?: string }> {
  const secret = await getSecret();
  if (!secret) return { error: "Não autenticado." };
  const { data, error } = await supabase().rpc("admin_upsert_revendedor", {
    p_secret: secret,
    p_id: payload.id,
    p_nome: payload.nome,
    p_cidade: payload.cidade,
  });
  if (error) return { error: error.message };
  return { id: data as string };
}

export async function setDestaque(
  id: string,
  destaque: boolean
): Promise<{ error?: string }> {
  const secret = await getSecret();
  if (!secret) return { error: "Não autenticado." };
  const { error } = await supabase().rpc("admin_set_destaque", {
    p_secret: secret,
    p_id: id,
    p_destaque: destaque,
  });
  if (error) return { error: error.message };
  return {};
}
```

- [ ] **Passo 4: Verificar**

```bash
npm run build
npm run lint
```

Esperado: ambos verdes (não há teste automatizado de RPC neste projeto
— a verificação é a migração aplicada + build TypeScript passando contra
os novos tipos).

- [ ] **Passo 5: Commit**

```bash
git add supabase/migrations/0004_revendedores.sql app/admin/actions.ts
git commit -m "feat: backend de Revendedores (tabela + RPCs) e admin_set_destaque"
```

---

### Task 2: Tokens de design, `SwingTag.textColor`, helper de status, ícones

**Files:**
- Modify: `app/globals.css`
- Modify: `components/SwingTag.tsx`
- Create: `lib/admin-status.ts`
- Modify: `package.json` (dependência nova)

**Interfaces:**
- Produz (consumido por todas as tasks 3–10): tokens `--adm-*`,
  `SwingTag`'s novo prop `textColor`, `corStatus(status)` de
  `lib/admin-status.ts`.
- `lucide-react` fica disponível para importar ícones (`LayoutDashboard`,
  `ClipboardList`, `ShoppingBag`, `Wallet`, `Users2`, `Settings`,
  `Search`, `Bell`, `Check`, `X`, `Plus`, `Minus`) nas tasks seguintes.

- [ ] **Passo 1: Instalar `lucide-react`**

```bash
npm install lucide-react
```

- [ ] **Passo 2: Adicionar os tokens `--adm-*` em `app/globals.css`**

Adicionar dentro do bloco `:root { ... }` já existente, depois da última
linha (`--fs-wordmark: ...;`), sem remover nada:

```css
  --adm-text-secondary: #8A7A70;
  --adm-success-bg: #EAFBF4;
  --adm-success-text: #2E7D63;
  --adm-purple-bg: #F2ECFF;
  --adm-purple-text: #6E56B8;
  --adm-orange-bg: #FFF3E8;
  --adm-orange-text: #C46A1F;
  --adm-pink-bg: #FFF0F4;
  --adm-pink-text: #C4416F;
  --adm-trend-positive: #3FA383;
```

- [ ] **Passo 3: Adicionar `textColor` ao `SwingTag`**

Editar `components/SwingTag.tsx` — adicionar o prop opcional
`textColor` (default `"var(--ink)"`, preservando 100% do comportamento
atual em todo uso existente na vitrine, que nunca passa esse prop):

```tsx
import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";

export type SwingTagSize = "sm" | "md" | "lg";

export default function SwingTag({
  children,
  color = "var(--peach)",
  textColor = "var(--ink)",
  size = "sm",
  rotate = -4,
  href,
  onClick,
  className,
}: {
  children: ReactNode;
  color?: string;
  textColor?: string;
  size?: SwingTagSize;
  rotate?: number;
  href?: string;
  onClick?: () => void;
  className?: string;
}) {
  const style = {
    "--tag-color": color,
    "--tag-rotate": `${rotate}deg`,
    color: textColor,
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

(`color: textColor` no `style` sobrescreve o `color: var(--ink)` fixo
que hoje vem da classe `.swing-tag` em `app/globals.css` — inline style
sempre vence a classe, então isso é seguro e não precisa editar a classe
CSS. Confirme lendo `.swing-tag` em `app/globals.css` antes de editar,
caso a regra tenha mudado desde a redação deste plano.)

- [ ] **Passo 4: Criar `lib/admin-status.ts`**

```ts
// Cor de badge (swing tag) por status, usada nas telas do admin
// (Pedidos, Financeiro, Revendedores). Ver spec
// docs/superpowers/specs/2026-09-21-loja-lola-admin-dashboard-design.md.
export function corStatus(status: string): { bg: string; text: string } {
  const map: Record<string, { bg: string; text: string }> = {
    "Entregue": { bg: "var(--adm-success-bg)", text: "var(--adm-success-text)" },
    "Aprovado": { bg: "var(--adm-success-bg)", text: "var(--adm-success-text)" },
    "Pago": { bg: "var(--adm-success-bg)", text: "var(--adm-success-text)" },
    "Retirado": { bg: "var(--adm-success-bg)", text: "var(--adm-success-text)" },
    "Enviado": { bg: "var(--adm-purple-bg)", text: "var(--adm-purple-text)" },
    "Pronto para retirada": { bg: "var(--adm-purple-bg)", text: "var(--adm-purple-text)" },
    "Em preparação": { bg: "var(--adm-orange-bg)", text: "var(--adm-orange-text)" },
    "Preparando": { bg: "var(--adm-orange-bg)", text: "var(--adm-orange-text)" },
    "Pendente": { bg: "var(--adm-orange-bg)", text: "var(--adm-orange-text)" },
    "Aguardando pagamento": { bg: "var(--adm-orange-bg)", text: "var(--adm-orange-text)" },
    "Cancelado": { bg: "var(--adm-pink-bg)", text: "var(--adm-pink-text)" },
    "Recusado": { bg: "var(--adm-pink-bg)", text: "var(--adm-pink-text)" },
  };
  return map[status] ?? map["Pendente"];
}
```

- [ ] **Passo 5: Verificar**

```bash
npm run build
npm run lint
```

Confirme especificamente que `npm run build` não gera nenhum erro em
componentes da vitrine que usam `SwingTag` sem `textColor` (deve
continuar renderizando texto `var(--ink)` igual antes).

- [ ] **Passo 6: Commit**

```bash
git add app/globals.css components/SwingTag.tsx lib/admin-status.ts package.json package-lock.json
git commit -m "feat: tokens do admin, SwingTag.textColor, corStatus() e lucide-react"
```

---

### Task 3: `AdminSidebar`

**Files:**
- Create: `components/admin/AdminSidebar.tsx`

**Interfaces:**
- Consome: nada de rede — recebe tudo via props.
- Produz (consumido pela Task 4): `<AdminSidebar screen={Screen} onNavigate={(s: Screen) => void} onOpenConfig={() => void} onLogout={() => void} pendingRevendedores={number} />`.

- [ ] **Passo 1: Criar `components/admin/AdminSidebar.tsx`**

```tsx
"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  ClipboardList,
  ShoppingBag,
  Wallet,
  Users2,
  Settings,
} from "lucide-react";
import { BRAND } from "@/lib/brand.config";

export type AdminScreen =
  | "visao-geral"
  | "pedidos"
  | "produtos"
  | "financeiro"
  | "revendedores";

const NAV_ITEMS: { key: AdminScreen; label: string; Icon: typeof LayoutDashboard }[] = [
  { key: "visao-geral", label: "Visão geral", Icon: LayoutDashboard },
  { key: "pedidos", label: "Pedidos", Icon: ClipboardList },
  { key: "produtos", label: "Produtos", Icon: ShoppingBag },
  { key: "financeiro", label: "Financeiro", Icon: Wallet },
  { key: "revendedores", label: "Revendedores", Icon: Users2 },
];

export default function AdminSidebar({
  screen,
  onNavigate,
  onOpenConfig,
  onLogout,
  pendingRevendedores,
}: {
  screen: AdminScreen;
  onNavigate: (s: AdminScreen) => void;
  onOpenConfig: () => void;
  onLogout: () => void;
  pendingRevendedores: number;
}) {
  return (
    <aside
      style={{
        width: 232,
        flex: "none",
        background: "var(--surface)",
        borderRight: "1px solid var(--line)",
        display: "flex",
        flexDirection: "column",
        padding: "24px 16px",
        gap: 28,
        minHeight: "100vh",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 8px" }}>
        <Link
          href="/"
          target="_blank"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 22,
            color: "var(--ink)",
            lineHeight: 1,
          }}
        >
          {BRAND.nome}
        </Link>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.06em",
            color: "var(--adm-text-secondary)",
            textTransform: "uppercase",
          }}
        >
          admin
        </span>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.08em",
            color: "var(--adm-text-secondary)",
            padding: "8px 12px 4px",
          }}
        >
          GERAL
        </div>
        {NAV_ITEMS.map(({ key, label, Icon }) => {
          const active = screen === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onNavigate(key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 10,
                cursor: "pointer",
                border: "none",
                background: active ? "var(--adm-orange-bg)" : "transparent",
                color: active ? "var(--adm-orange-text)" : "var(--ink)",
                font: "inherit",
                textAlign: "left",
              }}
            >
              <Icon size={18} style={{ flex: "none" }} />
              <span style={{ fontSize: 14, fontWeight: 500, whiteSpace: "nowrap" }}>
                {label}
              </span>
              {key === "revendedores" && pendingRevendedores > 0 && (
                <span
                  style={{
                    marginLeft: "auto",
                    background: "var(--peach)",
                    color: "var(--ink)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    fontWeight: 600,
                    borderRadius: 10,
                    padding: "2px 7px",
                  }}
                >
                  {pendingRevendedores}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div
        style={{
          marginTop: "auto",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 12px",
          borderRadius: 12,
          background: "var(--bg)",
          border: "1px solid var(--line)",
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--pink), var(--lilac))",
            flex: "none",
          }}
        />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{BRAND.nome}</div>
          <div style={{ fontSize: 11, color: "var(--adm-text-secondary)" }}>Dona da loja</div>
        </div>
        <button
          type="button"
          onClick={onOpenConfig}
          title="Configurações"
          style={{
            flex: "none",
            width: 30,
            height: 30,
            borderRadius: 8,
            border: "1px solid var(--line)",
            background: "var(--surface)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <Settings size={16} />
        </button>
      </div>

      <button
        type="button"
        onClick={onLogout}
        style={{
          background: "none",
          border: "none",
          color: "var(--adm-text-secondary)",
          fontSize: 12,
          cursor: "pointer",
          textAlign: "left",
          padding: "0 12px",
        }}
      >
        Sair
      </button>
    </aside>
  );
}
```

(`--lilac` já existe como token global desde a recriação da Home — usado
aqui só pra compor o gradiente do avatar, igual ao canvas.)

- [ ] **Passo 2: Verificar**

```bash
npm run build
npm run lint
```

- [ ] **Passo 3: Commit**

```bash
git add components/admin/AdminSidebar.tsx
git commit -m "feat: componente AdminSidebar"
```

---

### Task 4: Reestruturar `AdminApp.tsx` (sidebar, header, roteamento de telas)

**Files:**
- Modify: `components/admin/AdminApp.tsx`

**Interfaces:**
- Consome: `AdminSidebar` (Task 3), `fetchRevendedores` (Task 1) para o
  badge de pendentes.
- Produz (consumido pelas Tasks 5–10): a estrutura de layout
  (sidebar + header + `<section>` de conteúdo) que cada tela vive
  dentro. Mantém **exatamente** os mesmos nomes de state/handlers já
  existentes em `AdminApp.tsx` (`products`, `categorias`, `orders`,
  `sales`, `config`, `orderFiltro`, `salesFiltro`, `refreshProducts`,
  `refreshCategorias`, `refreshOrders`, `refreshSales`,
  `handleOrderFiltro`, `handleSalesFiltro`, `refreshConfig`,
  `handleToggleAtivo`, `handleToggleSurpresa`, `handleDelete`,
  `toggleDescontoRow`, `handleSalvarDesconto`, `handleRemoverDesconto`,
  `editingId`, `busyId`, `descontoOpenId`, `descontoInput`) — só a
  camada de apresentação (JSX de layout) muda.

- [ ] **Passo 1: Ler o arquivo atual por completo antes de editar**

`AdminApp.tsx` tem 607 linhas — leia inteiro pra não perder nenhum
handler ao reestruturar o JSX.

- [ ] **Passo 2: Trocar o tipo `Tab` por `AdminScreen` e adicionar estado de revendedores**

```ts
import AdminSidebar, { type AdminScreen } from "./AdminSidebar";
import { fetchRevendedores, type Revendedor } from "@/app/admin/actions";
```

Trocar `const [tab, setTab] = useState<Tab>("produtos");` por:

```ts
const [screen, setScreen] = useState<AdminScreen>("visao-geral");
const [produtosSubTab, setProdutosSubTab] = useState<"produtos" | "categorias">("produtos");
const [configOpen, setConfigOpen] = useState(false);
const [revendedores, setRevendedores] = useState<Revendedor[]>([]);
```

Adicionar, junto dos outros `refresh*`:

```ts
async function refreshRevendedores(status: string = "todos") {
  setRevendedores(await fetchRevendedores(status));
}
```

Carregar revendedores uma vez ao montar (pro badge de pendentes na
sidebar funcionar mesmo antes de abrir a aba):

```ts
useEffect(() => {
  refreshRevendedores();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

(Adicionar `useEffect` ao import de `"react"`.) Remover o antigo
`type Tab = ...` e o array `TABS` (substituídos pelo `AdminSidebar`).

- [ ] **Passo 3: Trocar o `<header>` de topo e o layout raiz pelo par sidebar + main**

Substituir o `<div style={{ minHeight: "100vh", ... }}><header>...</header><div style={{maxWidth:1100,...}}>{tab === ...}</div></div>` por:

```tsx
return (
  <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
    <AdminSidebar
      screen={screen}
      onNavigate={setScreen}
      onOpenConfig={() => setConfigOpen(true)}
      onLogout={handleLogout}
      pendingRevendedores={revendedores.filter((r) => r.status === "pendente").length}
    />
    <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px 32px",
          borderBottom: "1px solid var(--line)",
          background: "var(--surface)",
        }}
      >
        <div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>{SCREEN_TITLES[screen][0]}</div>
          <div style={{ fontSize: 13, color: "var(--adm-text-secondary)", marginTop: 2 }}>
            {SCREEN_TITLES[screen][1]}
          </div>
        </div>
        <a href="/" target="_blank" style={{ fontSize: 12, color: "var(--adm-text-secondary)" }}>
          Ver site ↗
        </a>
      </header>
      <section style={{ flex: 1, padding: "28px 32px 40px", overflow: "auto" }}>
        {/* telas — Passo 4 */}
      </section>
    </main>
    {configOpen && <ConfigTab config={config} onSaved={refreshConfig} onClose={() => setConfigOpen(false)} />}
  </div>
);
```

Adicionar, antes do `export default function AdminApp`:

```ts
const SCREEN_TITLES: Record<AdminScreen, [string, string]> = {
  "visao-geral": ["Visão geral", "Acompanhe o desempenho da loja em tempo real"],
  pedidos: ["Pedidos", "Todos os pedidos de varejo e atacado"],
  produtos: ["Produtos", "Gerencie visibilidade, destaque e desconto"],
  financeiro: ["Financeiro", "Receita, repasses e lançamentos"],
  revendedores: ["Revendedores", "Aprove ou recuse solicitações de atacado"],
};
```

(`ConfigTab` ganha um prop novo `onClose` na Task 10 — por enquanto,
neste passo, só deixe a chamada como acima; a Task 10 ajusta a
assinatura do componente. Se a Task 10 ainda não rodou quando este passo
for implementado, adicione `onClose` como prop opcional temporária ou
sinalize `NEEDS_CONTEXT` — mas como as tasks rodam em ordem, isso não
deve acontecer.)

- [ ] **Passo 4: Roteamento de telas dentro do `<section>`**

Dentro do `<section>`, renderizar condicionalmente por `screen`:

```tsx
{screen === "visao-geral" && (
  <VisaoGeralTab
    products={products}
    orders={orders}
    sales={sales}
    revendedoresPendentes={revendedores.filter((r) => r.status === "pendente").slice(0, 3)}
    onAprovar={async (id) => { await setRevendedorStatus(id, "aprovado"); await refreshRevendedores(); }}
    onRecusar={async (id) => { await setRevendedorStatus(id, "recusado"); await refreshRevendedores(); }}
    onGoPedidos={() => setScreen("pedidos")}
    onGoProdutos={() => setScreen("produtos")}
    onGoRevendedores={() => setScreen("revendedores")}
  />
)}
{screen === "pedidos" && (
  <PedidosTab orders={orders} filtro={orderFiltro} onFiltro={handleOrderFiltro} onChange={refreshOrders} />
)}
{screen === "produtos" && (
  editingId !== null ? (
    <ProductEditor
      product={produtoEmEdicao}
      categorias={categorias}
      onChange={refreshProducts}
      onDone={async () => { setEditingId(null); await refreshProducts(); }}
    />
  ) : produtosSubTab === "produtos" ? (
    <ProdutosTab
      products={products}
      busyId={busyId}
      descontoOpenId={descontoOpenId}
      descontoInput={descontoInput}
      onNovoProduto={() => setEditingId("novo")}
      onEditar={(id) => setEditingId(id)}
      onToggleAtivo={handleToggleAtivo}
      onToggleDestaque={async (p) => { setBusyId(p.id); await setDestaque(p.id, !p.destaque); await refreshProducts(); setBusyId(null); }}
      onToggleSurpresa={handleToggleSurpresa}
      onDescontoToggle={toggleDescontoRow}
      onDescontoChange={setDescontoInput}
      onDescontoSalvar={handleSalvarDesconto}
      onDescontoRemover={handleRemoverDesconto}
      onExcluir={handleDelete}
      onSubTab={setProdutosSubTab}
      subTab={produtosSubTab}
    />
  ) : (
    <>
      <ProdutosSubTabSwitch subTab={produtosSubTab} onSubTab={setProdutosSubTab} />
      <CategoriasTab categorias={categorias} onChange={refreshCategorias} />
    </>
  )
)}
{screen === "financeiro" && (
  <SalesTab products={products} sales={sales} filtro={salesFiltro} onFiltro={handleSalesFiltro} onChange={refreshSales} />
)}
{screen === "revendedores" && (
  <RevendedoresTab
    revendedores={revendedores}
    onAprovar={async (id) => { await setRevendedorStatus(id, "aprovado"); await refreshRevendedores(); }}
    onRecusar={async (id) => { await setRevendedorStatus(id, "recusado"); await refreshRevendedores(); }}
    onCadastrar={async (nome, cidade) => { await upsertRevendedor({ id: null, nome, cidade }); await refreshRevendedores(); }}
  />
)}
```

Import as novas funções/RPCs no topo: `setRevendedorStatus`,
`upsertRevendedor`, `setDestaque` de `@/app/admin/actions`; os
componentes `VisaoGeralTab`, `ProdutosTab`, `RevendedoresTab` (criados
nas Tasks 5–7 — este passo só liga os fios; se alguma dessas tasks
ainda não existir no momento em que Task 4 for implementada, é sinal de
que a ordem do plano não foi seguida).

**Nota:** `ProdutosSubTabSwitch` é um pequeno componente inline (pode
viver dentro de `ProdutosTab.tsx`, Task 7 — remover a menção duplicada
aqui se a Task 7 já cobrir o switch internamente. A Task 7 é quem decide
a forma exata; este passo só precisa garantir que clicar em
"Categorias" mostra `CategoriasTab` e clicar em "Produtos" volta pra
`ProdutosTab`.)

- [ ] **Passo 5: Remover o JSX antigo da listagem de produtos (movido pra `ProdutosTab` na Task 7)**

Depois de extrair a lógica de renderização da lista de produtos (o bloco
grande de `products.map(...)` com os botões inline), remova-o de
`AdminApp.tsx` — a listagem em si passa a viver em
`components/admin/ProdutosTab.tsx` (Task 7). `AdminApp.tsx` continua
dono do **estado e dos handlers** (`busyId`, `descontoOpenId` etc.),
só não renderiza mais a tabela diretamente.

- [ ] **Passo 6: Verificar**

```bash
npm run build
npm run lint
```

Build vai falhar até as Tasks 5–7/10 existirem (`VisaoGeralTab`,
`ProdutosTab`, `RevendedoresTab`, `ConfigTab.onClose`) — **isso é
esperado nesta task isoladamente**. Se você for o implementador desta
task rodando fora de ordem, pare aqui e reporte BLOCKED pedindo as
tasks dependentes primeiro. Se estiver rodando em ordem (Tasks 1→2→3→4
já feitas, mas 5–7/10 ainda não), o controller sabe disso e não vai
rodar o build final até a Task 10 terminar — cheque com
`tsc --noEmit` apontado só pros arquivos já existentes se quiser uma
verificação parcial, mas não bloqueie a task por isso.

- [ ] **Passo 7: Commit**

```bash
git add components/admin/AdminApp.tsx
git commit -m "feat: reestrutura AdminApp com sidebar e roteamento de telas"
```

---

### Task 5: `VisaoGeralTab` (nova)

**Files:**
- Create: `components/admin/VisaoGeralTab.tsx`

**Interfaces:**
- Consome: `Product`, `Order`, `Sale` de `@/lib/types`; `totalEstoque`
  de `@/lib/types`; `corStatus` de `@/lib/admin-status`; `SwingTag`.
- Produz: `<VisaoGeralTab products={Product[]} orders={Order[]} sales={Sale[]} revendedoresPendentes={{id,nome,cidade}[]} onAprovar={(id)=>void} onRecusar={(id)=>void} onGoPedidos={()=>void} onGoProdutos={()=>void} onGoRevendedores={()=>void} />`.

- [ ] **Passo 1: Criar `components/admin/VisaoGeralTab.tsx`**

```tsx
"use client";

import { useMemo, useState } from "react";
import type { Product, Order, Sale } from "@/lib/types";
import { totalEstoque } from "@/lib/types";
import SwingTag from "@/components/SwingTag";
import { corStatus } from "@/lib/admin-status";

type Filtro = "todos" | "varejo" | "atacado";
const FILTROS: { key: Filtro; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "varejo", label: "Varejo" },
  { key: "atacado", label: "Atacado" },
];

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function VisaoGeralTab({
  products,
  orders,
  sales,
  revendedoresPendentes,
  onAprovar,
  onRecusar,
  onGoPedidos,
  onGoProdutos,
  onGoRevendedores,
}: {
  products: Product[];
  orders: Order[];
  sales: Sale[];
  revendedoresPendentes: { id: string; nome: string; cidade: string }[];
  onAprovar: (id: string) => void;
  onRecusar: (id: string) => void;
  onGoPedidos: () => void;
  onGoProdutos: () => void;
  onGoRevendedores: () => void;
}) {
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const salesFiltradas = useMemo(
    () => sales.filter((s) => filtro === "todos" || (filtro === "atacado") === s.is_atacado),
    [sales, filtro]
  );
  const totalGeral = salesFiltradas.reduce((sum, s) => sum + Number(s.valor_total), 0);
  const mesAtual = new Date().toISOString().slice(0, 7);
  const totalMes = salesFiltradas
    .filter((s) => s.data?.slice(0, 7) === mesAtual)
    .reduce((sum, s) => sum + Number(s.valor_total), 0);

  // Série de 12 meses (mês atual + 11 anteriores) a partir de `sales` (todas, não só o filtro,
  // pra não achatar o gráfico quando o filtro é Varejo/Atacado — mesma leitura do canvas,
  // onde o corte de KPI é textual, "Recorte: X", e o gráfico reage ao filtro via essa base).
  const meses = useMemo(() => {
    const hoje = new Date();
    const labels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const arr: { label: string; total: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7);
      const total = salesFiltradas
        .filter((s) => s.data?.slice(0, 7) === key)
        .reduce((sum, s) => sum + Number(s.valor_total), 0);
      arr.push({ label: labels[d.getMonth()], total });
    }
    return arr;
  }, [salesFiltradas]);

  const max = Math.max(...meses.map((m) => m.total), 1) * 1.1;
  const toPath = (w: number, h: number) =>
    meses.map((m, i) => `${i === 0 ? "M" : "L"} ${(i / (meses.length - 1)) * w} ${h - (m.total / max) * h}`).join(" ");
  const chartPath = toPath(720, 190);
  const chartAreaPath = `${chartPath} L 720 200 L 0 200 Z`;

  const pedidosAguardando = orders.filter((o) => o.status === "preparando").slice(0, 4);
  const estoqueBaixo = products
    .filter((p) => totalEstoque(p) <= 5)
    .map((p) => ({ id: p.id, nome: p.nome, categoria: p.categoria?.nome ?? "", estoque: totalEstoque(p) }))
    .slice(0, 4);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", gap: 6, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: 4, width: "fit-content" }}>
        {FILTROS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFiltro(f.key)}
            style={{
              border: "none",
              borderRadius: 8,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              background: filtro === f.key ? "var(--peach)" : "transparent",
              color: filtro === f.key ? "var(--ink)" : "var(--adm-text-secondary)",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16 }}>
        <KpiCard label="VENDAS TOTAIS" value={brl(totalGeral)} trend="↑ 8,2% no período" />
        <KpiCard label="VENDAS DO MÊS" value={brl(totalMes)} trend="↑ 12% vs. mês anterior" />
        <KpiCard label="Nº DE VENDAS" value={String(salesFiltradas.length)} trend={`Recorte: ${FILTROS.find((f) => f.key === filtro)!.label}`} trendColor="var(--adm-text-secondary)" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(360px,1fr))", gap: 16 }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 24, minWidth: 0 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Vendas no tempo</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--adm-text-secondary)" }}>últimos 12 meses</div>
          </div>
          <svg width="100%" height="200" viewBox="0 0 720 200" preserveAspectRatio="none">
            <path d={chartAreaPath} fill="url(#gradFillAdmin)" />
            <path d={chartPath} fill="none" stroke="var(--pink)" strokeWidth={3} />
            <defs>
              <linearGradient id="gradFillAdmin" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--pink)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="var(--pink)" stopOpacity={0} />
              </linearGradient>
            </defs>
          </svg>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(12,minmax(0,1fr))", marginTop: 6, fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--adm-text-secondary)", textAlign: "center" }}>
            {meses.map((m, i) => <span key={i}>{m.label}</span>)}
          </div>
        </div>

        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Revendedores pendentes</div>
          {revendedoresPendentes.length === 0 ? (
            <p style={{ fontSize: 12.5, color: "var(--adm-text-secondary)" }}>Nenhum cadastro pendente.</p>
          ) : (
            revendedoresPendentes.map((r) => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.nome}</div>
                  <div style={{ fontSize: 11, color: "var(--adm-text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.cidade}</div>
                </div>
                <button onClick={() => onAprovar(r.id)} style={{ flex: "none", width: 28, height: 28, borderRadius: 8, border: "1px solid var(--mint)", background: "var(--adm-success-bg)", cursor: "pointer" }}>✓</button>
                <button onClick={() => onRecusar(r.id)} style={{ flex: "none", width: 28, height: 28, borderRadius: 8, border: "1px solid var(--pink)", background: "var(--adm-pink-bg)", cursor: "pointer" }}>✕</button>
              </div>
            ))
          )}
          <button onClick={onGoRevendedores} style={{ marginTop: "auto", background: "none", border: "none", color: "var(--peach-deep)", fontSize: 12, fontWeight: 600, textAlign: "left", cursor: "pointer", padding: 0 }}>
            Ver todos →
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 16 }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Pedidos aguardando ação</div>
            <button onClick={onGoPedidos} style={{ background: "none", border: "none", color: "var(--peach-deep)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Ver todos →</button>
          </div>
          {pedidosAguardando.length === 0 ? (
            <p style={{ fontSize: 12.5, color: "var(--adm-text-secondary)" }}>Nenhum pedido aguardando ação.</p>
          ) : (
            pedidosAguardando.map((o) => {
              const cor = corStatus("Em preparação");
              return (
                <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                  <SwingTag color={cor.bg} textColor={cor.text} size="sm">Em preparação</SwingTag>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>#{o.id.slice(0, 8)} · {o.cliente_nome}</div>
                    <div style={{ fontSize: 11, color: "var(--adm-text-secondary)" }}>{o.is_atacado ? "Atacado" : "Varejo"}</div>
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600 }}>{brl(o.valor_total)}</div>
                </div>
              );
            })
          )}
        </div>

        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Estoque baixo</div>
            <button onClick={onGoProdutos} style={{ background: "none", border: "none", color: "var(--peach-deep)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Ver todos →</button>
          </div>
          {estoqueBaixo.length === 0 ? (
            <p style={{ fontSize: 12.5, color: "var(--adm-text-secondary)" }}>Nenhum produto com estoque baixo.</p>
          ) : (
            estoqueBaixo.map((e) => (
              <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{e.nome}</div>
                  <div style={{ fontSize: 11, color: "var(--adm-text-secondary)" }}>{e.categoria}</div>
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600, color: "var(--pink)" }}>{e.estoque} un.</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, trend, trendColor = "var(--adm-trend-positive)" }: { label: string; value: string; trend: string; trendColor?: string }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 20 }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--adm-text-secondary)", letterSpacing: "0.04em" }}>{label}</div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(20px,2.2vw,28px)", fontWeight: 600, marginTop: 8 }}>{value}</div>
      <div style={{ fontSize: 12, color: trendColor, marginTop: 6 }}>{trend}</div>
    </div>
  );
}
```

- [ ] **Passo 2: Verificar**

```bash
npm run build
npm run lint
```

(O build só fecha 100% verde depois que `AdminApp.tsx`, Task 4, importar
este componente — nesta task isolada, rode pelo menos `npx tsc --noEmit`
pra checar que o arquivo em si não tem erro de tipo interno.)

- [ ] **Passo 3: Commit**

```bash
git add components/admin/VisaoGeralTab.tsx
git commit -m "feat: tela Visão geral do admin"
```

---

### Task 6: `RevendedoresTab` (nova)

**Files:**
- Create: `components/admin/RevendedoresTab.tsx`

**Interfaces:**
- Consome: `Revendedor` (Task 1), `SwingTag`, `corStatus`.
- Produz: `<RevendedoresTab revendedores={Revendedor[]} onAprovar={(id)=>void} onRecusar={(id)=>void} onCadastrar={(nome,cidade)=>void} />`.

- [ ] **Passo 1: Criar `components/admin/RevendedoresTab.tsx`**

```tsx
"use client";

import { useState } from "react";
import type { Revendedor } from "@/app/admin/actions";
import SwingTag from "@/components/SwingTag";
import { corStatus } from "@/lib/admin-status";

const STATUS_LABEL: Record<Revendedor["status"], string> = {
  pendente: "Cadastro pendente",
  aprovado: "Aprovado",
  recusado: "Recusado",
};

export default function RevendedoresTab({
  revendedores,
  onAprovar,
  onRecusar,
  onCadastrar,
}: {
  revendedores: Revendedor[];
  onAprovar: (id: string) => void;
  onRecusar: (id: string) => void;
  onCadastrar: (nome: string, cidade: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState("");
  const [cidade, setCidade] = useState("");

  function handleCadastrar() {
    if (!nome.trim()) return;
    onCadastrar(nome.trim(), cidade.trim());
    setNome("");
    setCidade("");
    setShowForm(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={() => setShowForm((v) => !v)}
          style={{ background: "var(--peach)", color: "var(--ink)", border: "none", borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          {showForm ? "Fechar" : "+ Cadastrar revendedor"}
        </button>
      </div>

      {showForm && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 20, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 200px" }}>
            <label style={{ fontSize: 12, color: "var(--adm-text-secondary)", display: "block", marginBottom: 6 }}>Nome da loja</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }} />
          </div>
          <div style={{ flex: "1 1 200px" }}>
            <label style={{ fontSize: 12, color: "var(--adm-text-secondary)", display: "block", marginBottom: 6 }}>Cidade</label>
            <input value={cidade} onChange={(e) => setCidade(e.target.value)} style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }} />
          </div>
          <button onClick={handleCadastrar} disabled={!nome.trim()} style={{ background: nome.trim() ? "var(--peach)" : "var(--line)", color: "var(--ink)", border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: nome.trim() ? "pointer" : "not-allowed" }}>
            Cadastrar
          </button>
        </div>
      )}

      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, overflowX: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 110px 160px 180px", minWidth: 820, padding: "14px 20px", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--adm-text-secondary)", letterSpacing: "0.04em", borderBottom: "1px solid var(--line)" }}>
          <div>LOJA</div><div>CIDADE</div><div>SOLICITADO</div><div>STATUS</div><div>AÇÕES</div>
        </div>
        {revendedores.length === 0 ? (
          <div style={{ padding: 24, fontSize: 13, color: "var(--adm-text-secondary)" }}>Nenhum revendedor cadastrado ainda.</div>
        ) : (
          revendedores.map((r) => {
            const cor = corStatus(STATUS_LABEL[r.status]);
            return (
              <div key={r.id} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 110px 160px 180px", minWidth: 820, padding: "16px 20px", alignItems: "center", borderBottom: "1px solid var(--line)" }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{r.nome}</div>
                <div style={{ fontSize: 13, color: "var(--adm-text-secondary)" }}>{r.cidade}</div>
                <div style={{ fontSize: 12, color: "var(--adm-text-secondary)" }}>{new Date(r.created_at).toLocaleDateString("pt-BR")}</div>
                <div>
                  {r.status === "pendente" ? (
                    <SwingTag color={cor.bg} textColor={cor.text} size="sm">Cadastro pendente</SwingTag>
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--adm-text-secondary)" }}>{STATUS_LABEL[r.status]}</span>
                  )}
                </div>
                {r.status === "pendente" ? (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => onAprovar(r.id)} style={{ background: "var(--adm-success-bg)", border: "1px solid var(--mint)", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Aprovar</button>
                    <button onClick={() => onRecusar(r.id)} style={{ background: "var(--adm-pink-bg)", border: "1px solid var(--pink)", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Recusar</button>
                  </div>
                ) : <div />}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
```

- [ ] **Passo 2: Verificar**

```bash
npm run build
npm run lint
```

- [ ] **Passo 3: Commit**

```bash
git add components/admin/RevendedoresTab.tsx
git commit -m "feat: tela Revendedores do admin"
```

---

### Task 7: `ProdutosTab` (extrai + redesenha a listagem de produtos)

**Files:**
- Create: `components/admin/ProdutosTab.tsx`

**Interfaces:**
- Consome: `Product` de `@/lib/types`, `totalEstoque`, `capaImagem`,
  `SwingTag`.
- Produz: `<ProdutosTab products={...} busyId={...} descontoOpenId={...} descontoInput={...} onNovoProduto={...} onEditar={...} onToggleAtivo={...} onToggleDestaque={...} onToggleSurpresa={...} onDescontoToggle={...} onDescontoChange={...} onDescontoSalvar={...} onDescontoRemover={...} onExcluir={...} subTab={...} onSubTab={...} />` —
  props espelham 1:1 os handlers já existentes em `AdminApp.tsx`
  (Task 4), só movendo onde a UI é desenhada.

- [ ] **Passo 1: Criar `components/admin/ProdutosTab.tsx`**

Tabela com colunas Produto (foto 44px + nome) / Categoria / Varejo /
Atacado / Estoque / Visível / Destaque / Live / Desconto — 9 colunas
(8 do canvas + "Live" pro toggle de Surpresa que o canvas não previa,
ver spec). Visível/Destaque/Live são toggles reais (`<input type="checkbox" className="swtoggle">`
— a classe `.swtoggle` **não existe ainda no projeto**; adicionar seu
CSS, copiado literalmente do canvas, ao final de `app/globals.css`
como parte desta task:

```css
input[type="checkbox"].swtoggle { appearance:none; width:36px; height:20px; border-radius:10px; background:var(--line); position:relative; cursor:pointer; outline:none; transition:background .15s; }
input[type="checkbox"].swtoggle:checked { background:var(--mint); }
input[type="checkbox"].swtoggle::after { content:""; position:absolute; top:2px; left:2px; width:16px; height:16px; border-radius:50%; background:#fff; transition:left .15s; box-shadow:0 1px 2px rgba(43,36,32,.25); }
input[type="checkbox"].swtoggle:checked::after { left:18px; }
```

Componente:

```tsx
"use client";

import type { Product } from "@/lib/types";
import { capaImagem, totalEstoque } from "@/lib/types";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function ProdutosTab({
  products,
  busyId,
  descontoOpenId,
  descontoInput,
  onNovoProduto,
  onEditar,
  onToggleAtivo,
  onToggleDestaque,
  onToggleSurpresa,
  onDescontoToggle,
  onDescontoChange,
  onDescontoSalvar,
  onDescontoRemover,
  onExcluir,
  subTab,
  onSubTab,
}: {
  products: Product[];
  busyId: string | null;
  descontoOpenId: string | null;
  descontoInput: string;
  onNovoProduto: () => void;
  onEditar: (id: string) => void;
  onToggleAtivo: (p: Product) => void;
  onToggleDestaque: (p: Product) => void;
  onToggleSurpresa: (p: Product) => void;
  onDescontoToggle: (p: Product) => void;
  onDescontoChange: (v: string) => void;
  onDescontoSalvar: (id: string) => void;
  onDescontoRemover: (id: string) => void;
  onExcluir: (p: Product) => void;
  subTab: "produtos" | "categorias";
  onSubTab: (t: "produtos" | "categorias") => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: 4 }}>
          <button onClick={() => onSubTab("produtos")} style={{ border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", background: subTab === "produtos" ? "var(--peach)" : "transparent", color: subTab === "produtos" ? "var(--ink)" : "var(--adm-text-secondary)" }}>Produtos</button>
          <button onClick={() => onSubTab("categorias")} style={{ border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", background: subTab === "categorias" ? "var(--peach)" : "transparent", color: subTab === "categorias" ? "var(--ink)" : "var(--adm-text-secondary)" }}>Categorias</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, color: "var(--adm-text-secondary)" }}>{products.length} produtos cadastrados</span>
          <button onClick={onNovoProduto} style={{ background: "var(--peach)", color: "var(--ink)", border: "none", borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+ Cadastrar produto</button>
        </div>
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, overflowX: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 100px 100px 80px 70px 70px 60px 90px", minWidth: 980, padding: "14px 20px", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--adm-text-secondary)", letterSpacing: "0.04em", borderBottom: "1px solid var(--line)" }}>
          <div>PRODUTO</div><div>CATEGORIA</div><div>VAREJO</div><div>ATACADO</div><div>ESTOQUE</div><div>VISÍVEL</div><div>DESTAQUE</div><div>LIVE</div><div>DESCONTO</div>
        </div>
        {products.length === 0 ? (
          <div style={{ padding: 24, fontSize: 13, color: "var(--adm-text-secondary)" }}>
            Nenhum produto cadastrado ainda. Clique em &quot;Cadastrar produto&quot; pra começar.
          </div>
        ) : (
          products.map((p) => {
            const estoque = totalEstoque(p);
            const capa = capaImagem(p);
            const busy = busyId === p.id;
            return (
              <div key={p.id}>
                <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 100px 100px 80px 70px 70px 60px 90px", minWidth: 980, padding: "14px 20px", alignItems: "center", borderBottom: "1px solid var(--line)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                    <button onClick={() => onEditar(p.id)} title="Editar produto" style={{ width: 44, height: 44, borderRadius: 10, flex: "none", overflow: "hidden", border: "none", padding: 0, cursor: "pointer", background: "var(--bg)" }}>
                      {capa && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={capa} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      )}
                    </button>
                    <button onClick={() => onEditar(p.id)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", fontSize: 13, fontWeight: 600, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.nome}
                    </button>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--adm-text-secondary)" }}>{p.categoria?.nome ?? "—"}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600 }}>{brl(p.preco)}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--adm-purple-text)" }}>{brl(p.preco_atacado ?? Math.round(p.preco * 0.5))}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: estoque <= 5 ? "var(--adm-pink-text)" : "var(--ink)" }}>{estoque}</div>
                  <div><input type="checkbox" className="swtoggle" checked={p.ativo} disabled={busy} onChange={() => onToggleAtivo(p)} /></div>
                  <div><input type="checkbox" className="swtoggle" checked={p.destaque} disabled={busy} onChange={() => onToggleDestaque(p)} /></div>
                  <div><input type="checkbox" className="swtoggle" checked={p.surpresa_ativo} disabled={busy} onChange={() => onToggleSurpresa(p)} /></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button onClick={() => onDescontoToggle(p)} style={{ fontFamily: "var(--font-mono)", fontSize: 12, background: p.desconto_percentual != null ? "var(--adm-orange-bg)" : "var(--bg)", color: p.desconto_percentual != null ? "var(--adm-orange-text)" : "var(--adm-text-secondary)", border: "none", borderRadius: 6, padding: "3px 8px", cursor: "pointer" }}>
                      {p.desconto_percentual != null ? `-${p.desconto_percentual}%` : "—"}
                    </button>
                  </div>
                </div>

                {descontoOpenId === p.id && (
                  <div style={{ padding: "0 20px 16px 76px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", borderBottom: "1px solid var(--line)" }}>
                    <label style={{ fontSize: 12, color: "var(--adm-text-secondary)" }}>Desconto de varejo (%):</label>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={descontoInput}
                      onChange={(e) => onDescontoChange(e.target.value)}
                      placeholder="Ex: 30"
                      style={{ width: 80, padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 12.5 }}
                    />
                    <button onClick={() => onDescontoSalvar(p.id)} disabled={busy} style={{ background: "var(--peach)", color: "var(--ink)", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      {busy ? "Salvando…" : "Salvar"}
                    </button>
                    {p.desconto_percentual != null && (
                      <button onClick={() => onDescontoRemover(p.id)} disabled={busy} style={{ background: "none", border: "1px solid var(--line)", borderRadius: 8, padding: "7px 14px", fontSize: 12, cursor: "pointer" }}>
                        Remover
                      </button>
                    )}
                    <button onClick={() => onExcluir(p)} disabled={busy} style={{ marginLeft: "auto", background: "none", border: "1px solid var(--adm-pink-text)", color: "var(--adm-pink-text)", borderRadius: 8, padding: "7px 14px", fontSize: 12, cursor: busy ? "wait" : "pointer" }}>
                      Excluir produto
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
```

(O botão "Excluir produto" — ausente do canvas, que não mostrava exclusão
— fica dentro do painel de desconto expandido, já que a linha principal
de 9 colunas não tem espaço pra mais uma ação; mantém a função existente
acessível sem inventar um menu de ações novo fora do escopo do canvas.)

- [ ] **Passo 2: Verificar**

```bash
npm run build
npm run lint
```

- [ ] **Passo 3: Commit**

```bash
git add components/admin/ProdutosTab.tsx app/globals.css
git commit -m "feat: tela Produtos redesenhada com tabela e toggles inline"
```

---

### Task 8: Reestilizar `PedidosTab`

**Files:**
- Modify: `components/admin/PedidosTab.tsx`

**Interfaces:**
- Props **não mudam** (`{ orders, filtro, onFiltro, onChange }`) — só o
  JSX interno.
- Consome: `SwingTag`, `corStatus` de `@/lib/admin-status`.

- [ ] **Passo 1: Ler o arquivo atual por completo antes de editar**

Preservar **toda** a lógica: `handleStatus`, `handleSettle`,
`expandedId` (expandir pra ver itens/endereço), `OPCOES_ENTREGA` /
`OPCOES_RETIRADA`, o botão "Marcar como pago" condicional a
`status === 'pendente'`.

- [ ] **Passo 2: Trocar o layout de lista por tabela, mantendo os handlers**

Estrutura de colunas do canvas — Pedido / Cliente-Revendedor / Tipo /
Itens / Valor / Entrega (status como `SwingTag` usando `corStatus`) /
Data — **mais** uma coluna de Ações (select de status + botão "Marcar
como pago" quando `pendente`) que o canvas não mostrava, e a linha
expansível de itens/endereço abaixo de cada linha (reaproveitando
`expandedId`, sem inventar comportamento novo). Filtro Todos/Varejo/
Atacado no topo com o mesmo estilo de pill usado na Task 5/7
(`background: filtro===f.key ? "var(--peach)" : "transparent"`).

Mapear `entrega_tipo`: manter a lógica atual (`OPCOES_ENTREGA` vs
`OPCOES_RETIRADA` conforme `o.entrega_tipo !== "retirada"`).

- [ ] **Passo 3: Verificar**

```bash
npm run build
npm run lint
```

Teste manual (dev server): expandir um pedido continua mostrando itens
e endereço; trocar o status continua chamando `admin_update_order_status`;
"Marcar como pago" continua visível só quando `pendente`.

- [ ] **Passo 4: Commit**

```bash
git add components/admin/PedidosTab.tsx
git commit -m "feat: reestiliza Pedidos com tabela e swing tags de status"
```

---

### Task 9: Reestilizar `SalesTab` (Financeiro)

**Files:**
- Modify: `components/admin/SalesTab.tsx`

**Interfaces:**
- Props **não mudam** (`{ products, sales, filtro, onFiltro, onChange }`).
- Consome: `corStatus`, `SwingTag` (só se o card "Repasses pendentes"
  ganhar algum indicador — opcional).

- [ ] **Passo 1: Ler o arquivo atual por completo antes de editar**

Preservar `SaleForm` (registro manual de venda) 100% como está
funcionalmente — só o card/tabela ao redor mudam de visual.

- [ ] **Passo 2: Trocar os 3 cards atuais por 4 cards do canvas**

- **Receita total**: `sales.reduce((s,x)=>s+Number(x.valor_total),0)`
  (igual ao `total` já calculado hoje).
- **A receber (Atacado)**: `sales.filter(s=>s.is_atacado && s.status !== 'aprovado').reduce((s,x)=>s+Number(x.valor_total),0)`
  (dado real — ver spec, `sales.status` já existe no schema).
- **Ticket médio**: `sales.length ? total/sales.length : 0`.
- **Repasses pendentes**: `0` fixo, com comentário
  `// TODO(F3): repasse de revendedor — sem conceito no schema ainda`.

- [ ] **Passo 3: Trocar a tabela de lançamentos pro visual do canvas**

Colunas Data/Pedido/Cliente-Revendedor/Valor/Pagamento/Status (status em
`SwingTag` via `corStatus(s.status)` — hoje `sales.status` é texto livre
tipo `'aprovado'`/`'pendente'`/`'cancelado'`; mapear pra label
apresentável antes de passar pro `corStatus`, ex.:
`{aprovado:'Pago', pendente:'Pendente', cancelado:'Cancelado'}[s.status] ?? s.status`).
Manter o botão "excluir" por linha (`deleteSale`) — o canvas não
mostrava exclusão, mas é funcionalidade existente que não pode sumir;
colocar como um ícone/texto discreto na última coluna, igual ao padrão
já usado hoje.

- [ ] **Passo 4: Verificar**

```bash
npm run build
npm run lint
```

- [ ] **Passo 5: Commit**

```bash
git add components/admin/SalesTab.tsx
git commit -m "feat: reestiliza Financeiro com 4 KPIs e tabela de lançamentos"
```

---

### Task 10: Reestilizar `ConfigTab` (vira painel lateral / modal via engrenagem)

**Files:**
- Modify: `components/admin/ConfigTab.tsx`

**Interfaces:**
- Props mudam: adiciona `onClose: () => void` (novo — o componente vira
  um painel que fecha, chamado pela `AdminSidebar`/`AdminApp`, Task 4).
  `config` e `onSaved` continuam como estão.

- [ ] **Passo 1: Ler o arquivo atual por completo antes de editar**

Preservar `changePassword` e `saveConfig` (troca de senha, taxa de
entrega, WhatsApp, cidade) 100% funcionalmente.

- [ ] **Passo 2: Envolver o conteúdo atual num painel modal**

```tsx
export default function ConfigTab({
  config,
  onSaved,
  onClose,
}: {
  config: Config;
  onSaved: () => void;
  onClose: () => void;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(43,36,32,.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }}>
      <div style={{ background: "var(--surface)", borderRadius: 16, padding: 28, width: "100%", maxWidth: 560, maxHeight: "90vh", overflow: "auto", boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Configurações</div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, color: "var(--adm-text-secondary)", cursor: "pointer" }}>✕</button>
        </div>
        {/* resto do conteúdo atual (formulário de senha + config) segue igual,
            só trocando cores hardcoded (--accent etc.) pelos tokens --adm-*/--peach
            onde fizer sentido visualmente */}
      </div>
    </div>
  );
}
```

Manter o resto do JSX interno (os dois `<form>`/cards de senha e config)
como já está, só trocando `var(--accent)` → `var(--peach)` e
`var(--muted)` → `var(--adm-text-secondary)` pra consistência visual com
o resto do admin novo (troca cosmética, não estrutural).

- [ ] **Passo 3: Verificar**

```bash
npm run build
npm run lint
```

- [ ] **Passo 4: Commit**

```bash
git add components/admin/ConfigTab.tsx
git commit -m "feat: ConfigTab vira painel modal acessível pela engrenagem da sidebar"
```

---

### Task 11: Verificação final

**Files:**
- Nenhum arquivo novo — só verificação e, se necessário, pequenos
  ajustes de integração encontrados nesta etapa.

- [ ] **Passo 1: Build completo**

```bash
npm run build
npm run lint
npm test
```

Esperado: os três verdes — esta é a primeira vez no plano que o build
fecha 100% (Tasks 4–10 têm dependências cruzadas entre si).

- [ ] **Passo 2: Grep de escopo — confirmar que a vitrine não foi tocada**

```bash
git diff --stat <base>..HEAD -- app/page.tsx app/produto app/carrinho app/checkout app/pedido app/minha-conta app/surpresa components/Header.tsx components/HeroCarousel.tsx components/ProductCard.tsx components/TrustStrip.tsx components/PaymentsFooter.tsx components/CategoryChips.tsx components/BrandStory.tsx
```

Esperado: **saída vazia** (zero linhas mudadas nesses caminhos). Se
algo aparecer, é uma violação do escopo e precisa ser revertido antes de
fechar a task.

- [ ] **Passo 3: QA visual manual (controller/usuário)**

Dev server, login no `/admin`, percorrer as 6 telas (Visão geral,
Pedidos, Produtos + sub-aba Categorias, Financeiro, Revendedores,
Config via engrenagem): confirmar que cada ação existente antes
(mudar status de pedido, marcar como pago, toggles de produto, editar
categoria, trocar senha, lançar venda manual, excluir venda/produto)
continua funcionando, e que a aba Revendedores aprova/recusa e cadastra
de verdade (dado persistido no Supabase).

- [ ] **Passo 4: Commit final (se o Passo 2 exigir correção)**

```bash
git add -A
git commit -m "chore: verificação final do dashboard do admin"
```
