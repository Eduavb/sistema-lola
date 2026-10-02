# Release único: Home, Login, Admin CMS e Atacado — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar Home nova, Login com Supabase Auth e papéis, Admin CMS completo e área de Atacado, tudo na branch `loja-lola-admin-dashboard`, para subir numa única leva.

**Architecture:** Supabase Auth para todos; papéis em `profiles`; RPCs `admin_*` validam sessão+papel (`assert_papel`) em vez de `p_secret`; o servidor Next guarda tokens em cookies httpOnly e chama o Supabase com `Authorization: Bearer`. Telas recriadas a partir dos protótipos `.dc.html` com os tokens existentes. SQL consolidado em `supabase/release-unico.sql`.

**Tech Stack:** Next.js 16.3.3 (App Router, **ler `node_modules/next/dist/docs/` antes de mexer em cookies, proxy/middleware e server actions — a API difere do que se conhece**), React 19, TypeScript, `@supabase/supabase-js`, `lucide-react`, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-02-loja-lola-release-home-login-atacado-design.md` (autoridade; conflitos neste plano resolvem a favor dele). Spec-mãe: `docs/superpowers/specs/2026-09-09-loja-lola-design.md`.
**Design:** `C:\Users\VOOA\Desktop\LOLA\LOLA Dashboards — Admin e Revendedor -atualizado\design_handoff_lola_dashboards\` (`README.md` + 4 `.dc.html`; ler o `.dc.html` da tela antes de implementá-la; ler o código-fonte do arquivo, não renderizar).

## Global Constraints

- **Nada sobe para GitHub, Vercel ou Supabase durante a execução.** Só commits locais na branch. Push, merge e SQL são decisão do dono ao final.
- O SQL **não é executável neste ambiente.** Todo SQL deve ser escrito com extremo cuidado e revisado por um revisor dedicado de SQL/segurança; nenhuma tarefa pode declarar SQL “testado”.
- Toda função SQL: `language plpgsql security definer set search_path = public, extensions` (pgcrypto vive em `extensions`). Nunca aceitar papel, uid ou preço vindos do cliente.
- Papéis: `superadmin`, `admin`, `supervisor`, `revendedor`, `cliente`. Matriz de acesso = spec §4.4 (fonte única no código: `lib/roles.ts`; no banco: argumentos de `assert_papel` por RPC).
- Português do Brasil em toda copy. Sem emojis na UI (usar `lucide-react`). Sem comentários óbvios.
- Estilo: CSS custom properties do `app/globals.css` + `style` inline (Tailwind está importado mas não usado). Tokens do README do design (`#FDF6F3`, `#2B2420`, `#EFE0DB`, rosa `#FF8FAB`, menta `#8FE3C8`, lilás `#C7A8FF`, pêssego `#FFA45C`, `#C4416F`). Fontes: Hanken Grotesk (texto), Martian Mono (números/IDs/cabeçalhos), Bacony Script só no logo e títulos pontuais.
- `SwingTag` (props `color` = fundo, `textColor` = texto) é o único elemento-assinatura de badge de status; nunca trocar as props.
- Logo é a imagem `/lola-logo.png` (já existe); cores de marca `--brand-magenta`, `--brand-orange` já existem.
- Cada tarefa termina com `npm run build`, `npm run lint` e `npm test` verdes (quando tocar TS) e um commit local. Mensagens de commit em português, prefixo convencional (`feat:`, `fix:`...), terminando com a linha de co-autoria exigida pela sessão.
- Nenhuma variável de ambiente nova (só `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` existentes).
- Ordem de despacho (decisão do controlador, SQL e libs antes das telas que as consomem): 1, 2, 3, 4, 7, 8, 9, 5, 6, 10, 11, 12, 13, 14, 15.

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `supabase/migrations/0004_auth_perfis.sql` (reescreve o antigo `0004_revendedores.sql`, nunca aplicado) | profiles, convites, trigger, `assert_papel`, RPCs de usuário |
| `supabase/migrations/0005_admin_por_sessao.sql` | todas as `admin_*` sem `p_secret` |
| `supabase/migrations/0006_atacado.sql` | revendedores, carrinho_atacado, RPCs atacado, RLS de pedidos do cliente |
| `supabase/migrations/0007_cms_textos_promos.sql` | textos_loja, banner_hero, promocoes, categorias.imagem, products.created_at, preço efetivo |
| `supabase/release-unico.sql`, `supabase/smoke.sql` | concatenação final + checagens de leitura |
| `lib/roles.ts` | tipos de papel, matriz de acesso, regras de gestão de usuários, destino pós-login |
| `lib/validators.ts` | máscaras e validação de CNPJ/WhatsApp/e-mail |
| `lib/auth.ts` | helpers de servidor: cookies de sessão, `authedSupabase()`, `getPerfil()`, `exigirPapel()` |
| `lib/textos.ts` | chaves/valores padrão de textos e merge com o banco |
| `lib/pricing.ts` | preço efetivo de varejo (produto × promoção) e de atacado |
| `app/entrar/**` | login, cadastro, revendedor, esqueci, redefinir |
| `app/admin/**`, `components/admin/**` | admin por sessão, sidebar agrupada, drawer, novas abas |
| `app/page.tsx`, `components/Header.tsx`, `components/PaymentsFooter.tsx`, `components/home/**` | Home e chrome do site |
| `app/atacado/**`, `components/atacado/**` | área do revendedor |

---

### Task 1: Migração 0004 — perfis, convites e `assert_papel`

**Files:**
- Create: `supabase/migrations/0004_auth_perfis.sql`
- Delete: `supabase/migrations/0004_revendedores.sql` (nunca aplicado em nenhum banco; seu conteúdo é substituído pelas Tasks 1 e 6)

**Interfaces:**
- Produces (SQL): enum `papel_usuario`; tabelas `profiles`, `convites_papel`; funções `assert_papel(p_papeis text[])` (lança `'sem permissão'` se `auth.uid()` nulo, perfil inexistente/inativo ou papel fora da lista), `get_my_profile()` (retorna jsonb do perfil do chamador ou null), `touch_ultimo_acesso()`, `admin_list_users()`, `admin_set_user(p_id uuid, p_papel text, p_ativo boolean)`, `admin_invite_user(p_email text, p_papel text)`, `admin_list_convites()`, `admin_delete_convite(p_email text)`.

- [ ] **Step 1:** Escrever o enum e as tabelas. `profiles(id uuid primary key references auth.users on delete cascade, email text not null, nome text not null default '', papel papel_usuario not null default 'cliente', ativo boolean not null default true, ultimo_acesso timestamptz, created_at timestamptz not null default now())`; `convites_papel(email text primary key check (email = lower(email)), papel papel_usuario not null, created_at timestamptz default now())`. `alter table ... enable row level security`; policy `profiles_self_select` (`for select to authenticated using (id = auth.uid())`); nenhuma policy de escrita; `convites_papel` sem policy.
- [ ] **Step 2:** Função de trigger `handle_auth_user()` (`security definer`, search_path fixo) para `after insert or update of email_confirmed_at on auth.users`: calcula `v_email := lower(new.email)`; `v_papel` = papel do convite **somente se** `new.email_confirmed_at is not null`; senão `'revendedor'` se `new.raw_user_meta_data->>'tipo' = 'revendedor'`; senão `'cliente'`. Faz `insert ... on conflict (id) do update set papel = excluded.papel, email = excluded.email` **sem rebaixar** um papel de equipe já concedido a menos que o convite tenha sido removido (documentar a regra no código SQL com um comentário curto). Nome vem de `raw_user_meta_data->>'nome'` (trim, default ''). **Nunca** ler papel de metadado.
- [ ] **Step 3:** `assert_papel` e `get_my_profile` (retorna `to_jsonb(p)` do `auth.uid()`; grant execute para `authenticated`). `admin_list_users()` exige `{superadmin,admin}`; retorna jsonb array com id, email, nome, papel, ativo, ultimo_acesso, created_at. `admin_set_user` exige `{superadmin,admin}` e aplica a matriz §4.4: só superadmin mexe em linhas/papéis `superadmin`; ninguém altera a si mesmo (`p_id = auth.uid()` → erro); impede deixar o sistema sem superadmin ativo (conta superadmins ativos restantes). `admin_invite_user` (normaliza e-mail para minúsculo, mesma regra de quem pode conceder `superadmin`, upsert em `convites_papel`, e se já existe `profiles` com esse e-mail **confirmado** atualiza o papel na hora). `admin_list_convites`/`admin_delete_convite` idem permissões.
- [ ] **Step 4:** `touch_ultimo_acesso()` (`authenticated`): `update profiles set ultimo_acesso = now() where id = auth.uid()`.
- [ ] **Step 5:** Reler o arquivo inteiro procurando: função sem `set search_path`, `grant`/`revoke` ausentes (revogar `execute` de `public` e conceder só aos papéis necessários: RPCs públicas para `anon, authenticated`; as demais só `authenticated`), qualquer caminho em que metadado do cliente defina papel de equipe.
- [ ] **Step 6:** Commit local `feat(db): perfis, convites e assert_papel`.

### Task 2: Migração 0005 — todas as `admin_*` por sessão

**Files:**
- Create: `supabase/migrations/0005_admin_por_sessao.sql`

**Interfaces:**
- Consumes: `assert_papel(text[])` (Task 1).
- Produces: as mesmas RPCs de `0002_functions.sql` sem o parâmetro `p_secret`, na mesma ordem de parâmetros restante: `admin_list_products()`, `admin_upsert_product(...)`, `admin_delete_product(p_id)`, `admin_set_ativo`, `admin_set_desconto`, `admin_set_surpresa`, `admin_upsert_color`, `admin_delete_color`, `admin_upsert_size`, `admin_delete_size`, `admin_list_categorias()`, `admin_upsert_categoria(...)`, `admin_delete_categoria`, `admin_list_orders(p_filtro)`, `admin_update_order_status`, `admin_settle_order`, `admin_list_sales(p_filtro)`, `admin_insert_sale(...)`, `admin_delete_sale`, `admin_get_config()`, `admin_set_config(p_taxa,p_whatsapp,p_cidade)`, mais `admin_set_destaque(p_id, p_destaque)`.

- [ ] **Step 1:** Para cada função acima: `drop function if exists <assinatura antiga com p_secret>;` e `create` nova com **corpo idêntico** ao de `0002`, trocando `perform assert_admin(p_secret)` por `perform assert_papel(<lista>)`. Listas: Produtos/Categorias/cores/tamanhos/surpresa/destaque/desconto/ativo → `{superadmin,admin}`; Pedidos (`list`, `update_status`, `settle`) → `{superadmin,admin,supervisor}`; Vendas `admin_list_sales` → `{superadmin,admin,supervisor}` **mas** para `supervisor` o retorno omite valores monetários agregáveis não pedidos? (ver Step 2); `admin_insert_sale`/`admin_delete_sale`/Financeiro → `{superadmin,admin}`; `admin_get_config`/`admin_set_config` → `{superadmin}` (leitura para `admin` também é necessária para o checkout? **não**: o checkout lê `admin_config` dentro de `checkout_iniciar_pedido`, que é `security definer`, então manter `{superadmin}`).
- [ ] **Step 2:** `admin_list_sales`: para papel `supervisor`, retornar os mesmos registros mas **sem** `preco_unit` e `valor_total` (campos nulos) — o supervisor acompanha vendas, não o financeiro. Implementar com `case when v_papel = 'supervisor' then null else s.valor_total end`; obter `v_papel` de `profiles` onde `id = auth.uid()`.
- [ ] **Step 3:** `drop function admin_set_secret(text, text)` e `assert_admin(text)` **somente se** nenhuma função remanescente os chamar (as de webhook usam `assert_webhook`, que permanece). Manter `admin_config.secret_hash` na tabela (coluna legada; não apagar dados).
- [ ] **Step 4:** Conferir por busca textual que nenhuma função em `0005` ainda menciona `p_secret` ou `assert_admin`, e que `mp_register_order_payment`/webhook **não** foram alterados.
- [ ] **Step 5:** Commit `feat(db): admin_* autenticadas por sessão e papel`.

### Task 3: `lib/roles.ts` e `lib/validators.ts` (puros, com testes)

**Files:**
- Create: `lib/roles.ts`, `lib/validators.ts`, `__tests__/roles.test.ts`, `__tests__/validators.test.ts`

**Interfaces (Produces):**
```ts
// lib/roles.ts
export type Papel = "superadmin" | "admin" | "supervisor" | "revendedor" | "cliente";
export const PAPEIS: Papel[];
export const EQUIPE: Papel[]; // superadmin, admin, supervisor
export type Tela = "visao-geral"|"pedidos"|"financeiro"|"produtos"|"promocoes"|"banner"|"textos"|"revendedores"|"usuarios"|"config";
export function podeAcessar(papel: Papel, tela: Tela): boolean;
export function telasVisiveis(papel: Papel): Tela[];            // ordem do menu
export function ehEquipe(papel: Papel): boolean;
export function podeAprovarRevendedor(papel: Papel): boolean;   // superadmin, admin
export function podeEditarRevendedor(papel: Papel): boolean;    // superadmin, admin, supervisor
export function podeGerirPapel(ator: Papel, alvo: Papel): boolean; // superadmin: todos; admin: todos exceto superadmin; demais: nenhum
export function destinoPosLogin(papel: Papel, next?: string | null): string; // equipe→/admin, revendedor→/atacado, cliente→next seguro ou "/"
// lib/validators.ts
export function mascararCnpj(v: string): string;
export function mascararWhatsapp(v: string): string;
export function cnpjValido(v: string): boolean;     // 14 dígitos + dígitos verificadores; rejeita sequências repetidas
export function emailValido(v: string): boolean;
export function nextSeguro(next: string | null | undefined): string; // só caminhos internos começando com "/" e não "//"; senão "/"
```
Matriz de `podeAcessar` = spec §4.4 (superadmin tudo; admin tudo exceto `config`; supervisor: `visao-geral`, `pedidos`, `revendedores`). `destinoPosLogin` aplica `nextSeguro`.

- [ ] **Step 1:** Escrever os testes (um `it` por regra da matriz: cada papel × cada tela via tabela; `podeGerirPapel` 5×5; `destinoPosLogin` com `next` malicioso como `//evil.com` e `https://x`; `cnpjValido("11.222.333/0001-81")` verdadeiro, `"11.111.111/1111-11"` falso, 13 dígitos falso; máscaras com entrada parcial e com letras).
- [ ] **Step 2:** `npm test` → falha. Implementar os dois módulos. Máscaras iguais às do protótipo (`LOLA Login.dc.html`, `cnpjMask` e `telMask`).
- [ ] **Step 3:** `npm test` verde; `npm run lint`; commit `feat: papéis, matriz de acesso e validadores`.

### Task 4: Sessão no servidor (`lib/auth.ts`) e ações de autenticação

**Files:**
- Create: `lib/auth.ts`, `app/entrar/actions.ts`, `__tests__/auth-cookies.test.ts` (só a parte pura: serialização/expiração de tokens)
- Modify: `lib/supabase.ts` (adicionar `authedSupabase`)

**Interfaces:**
```ts
// lib/auth.ts (server-only)
export async function getSessao(): Promise<{ accessToken: string; userId: string } | null>; // renova com refresh token se expirado, regrava cookies
export async function authedSupabase(): Promise<SupabaseClient>;  // header Authorization: Bearer; sem sessão → cliente anon
export async function getPerfil(): Promise<{ id:string; email:string; nome:string; papel:Papel; ativo:boolean } | null>; // via RPC get_my_profile
export async function exigirPapel(telaOuPapeis: Papel[]): Promise<Perfil>; // redireciona para /entrar?next=... se não atender
// app/entrar/actions.ts
entrarAction(prev, formData): Promise<{ error?: string; destino?: string }>
cadastrarAction(prev, formData): Promise<{ error?: string; sent?: string }>
cadastrarRevendedorAction(prev, formData): Promise<{ error?: string; sent?: string }>
esqueciAction(prev, formData): Promise<{ error?: string; sent?: string }>
redefinirAction(prev, formData): Promise<{ error?: string; ok?: boolean }>
sairAction(): Promise<void>
```

- [ ] **Step 1:** Ler `node_modules/next/dist/docs/` sobre `cookies()`, server actions e redirecionamento; registrar no ledger o que difere do esperado.
- [ ] **Step 2:** Cookies `lola_at` (access) e `lola_rt` (refresh): `httpOnly`, `secure`, `sameSite: "lax"`, `path: "/"`; access com `maxAge` do `expires_in`, refresh 30 dias. `getSessao` decodifica `exp` do JWT sem confiar nele para autorização (a autorização real é do Postgres) e renova quando faltam <60s. Em Server Components cookies não podem ser escritos: a renovação deve ocorrer em server action/route handler; `getSessao` em componentes apenas lê (se expirado, trata como sem sessão e o fluxo de login/`/entrar` renova — documentar a decisão no ledger).
- [ ] **Step 3:** Ações: `entrarAction` valida com `emailValido`, chama `auth.signInWithPassword`, mapeia erros do Supabase para PT-BR (“E-mail ou senha incorretos.”, “Confirme seu e-mail para entrar.”), grava cookies, chama RPC `touch_ultimo_acesso`, carrega o perfil, **bloqueia `ativo = false`** (apaga cookies; “Conta desativada.”) e devolve `destino = destinoPosLogin(papel, next)`. `cadastrarAction` → `signUp` com `data: { nome }` e `emailRedirectTo` = origem do site + `/entrar`. `cadastrarRevendedorAction` → `signUp` com `data: { tipo: "revendedor", nome, razao_social, cnpj (só dígitos), whatsapp (só dígitos) }` após validar `cnpjValido` e `mascarar*`; mensagem de sucesso do design. `esqueciAction` → `resetPasswordForEmail(email, { redirectTo: origem + "/entrar/redefinir" })` e **sempre** devolve a mesma mensagem de sucesso (não revelar se o e-mail existe). `redefinirAction` usa o token do fragmento (ver Task 5). `sairAction` apaga cookies.
- [ ] **Step 4:** Teste puro para decodificação/expiração do JWT e o mapeamento de erros. `npm test`, `npm run lint`, `npm run build`. Commit `feat: sessão por cookies e ações de autenticação`.

### Task 5: Página `/entrar` e `/entrar/redefinir`

**Files:**
- Create: `app/entrar/page.tsx`, `app/entrar/redefinir/page.tsx`, `components/auth/LoginView.tsx`, `components/auth/RedefinirView.tsx`

**Interfaces:** Consome as ações da Task 4 e `lib/validators.ts`. Query params: `?modo=entrar|cadastro|revendedor|esqueci` e `?next=`.

- [ ] **Step 1:** Ler `LOLA Login.dc.html` (fonte). Recriar fielmente: split desktop (foto `login-foto` ou bloco `#FFE4EC` com os textos `login.etiqueta` e `login.titulo` vindos de `getTextos()` de `lib/textos.ts` (Task 9, já entregue antes desta na ordem de despacho), mobile só formulário, abas segmentadas, card tracejado lilás “Quero ser revendedor”, inputs 48px raio 12 com foco pêssego + halo `#FFE4CC`, erro `#C4416F`, mensagem de sucesso menta. **Sem** botão/divisor Google, **sem** rodapé “Demo”, **sem** seletor Desktop/Mobile. Logo = `<img src="/lola-logo.png">`.
- [ ] **Step 2:** Estados e validação client-side idênticos ao protótipo (`DEFS`, `COPY`), usando `useActionState`. Campo senha com no mínimo 8 caracteres no cadastro. CNPJ/WhatsApp com as máscaras de `lib/validators.ts`.
- [ ] **Step 3:** `/entrar/redefinir`: o link do e-mail traz `#access_token=...&type=recovery`; ler o fragmento no cliente, enviar o token para `redefinirAction` (usa `auth.updateUser` com esse token em um cliente efêmero), tela “Nova senha” (mín. 8, confirmação), sucesso → link para `/entrar`.
- [ ] **Step 4:** Mobile 390px sem rolagem horizontal; foco visível; labels associadas aos inputs. `npm run build` e `lint`. Commit `feat: página de login e cadastro`.

### Task 6: Admin por sessão (actions, gate, ConfigTab, remoção da senha)

**Files:**
- Modify: `app/admin/actions.ts`, `app/admin/page.tsx`, `components/admin/AdminApp.tsx`, `components/admin/ConfigTab.tsx`
- Delete: `components/admin/LoginForm.tsx`
- Modify: `lib/types.ts` se necessário (tipo `Perfil`)

**Interfaces:** Consome `authedSupabase`, `exigirPapel`, `telasVisiveis`, `podeAcessar` (Tasks 3–4). `AdminApp` passa a receber `perfil: { nome: string; papel: Papel }`.

- [ ] **Step 1:** Em `actions.ts`: remover `COOKIE_NAME`, `getSecret`, `isLoggedIn`, `loginAdmin`, `logoutAdmin`, `changePassword`. Cada action passa a usar `const sb = await authedSupabase()` e chamar as RPCs **sem** `p_secret` (nomes/ordem da Task 2). Cada action começa com `await exigirPapel([...])` correspondente à matriz, e devolve `{ error: "Sem permissão." }` em vez de redirecionar quando chamada de um client component (usar uma variante `tentarPapel` que retorna booleano). Manter assinaturas públicas e tipos de retorno das actions existentes.
- [ ] **Step 2:** `app/admin/page.tsx`: `const perfil = await exigirPapel(EQUIPE)`; buscar só os dados que o papel pode ver (ex.: supervisor não busca config/financeiro); passar `perfil` ao `AdminApp`.
- [ ] **Step 3:** `AdminApp`: filtrar a sidebar e o roteamento com `telasVisiveis(perfil.papel)`; se a tela atual não é permitida, cair na primeira visível; “Sair” chama `sairAction`; cartão do usuário mostra nome e papel reais (rótulo em PT-BR: Superadmin, Admin, Supervisor). `ConfigTab`: remover seção de troca de senha; abrir o modal só para `superadmin`.
- [ ] **Step 4:** Remover referências órfãs; `npm run build`, `lint`, `test`. Commit `feat: admin autenticado por sessão e papel`.

### Task 7: Migração 0006 — atacado

**Files:**
- Create: `supabase/migrations/0006_atacado.sql`

**Interfaces (Produces):** tabelas `revendedores`, `carrinho_atacado`; RPCs `atacado_me()`, `atacado_cart_get()`, `atacado_cart_set_item(p_product_id uuid, p_color_id uuid, p_size_id uuid, p_quantidade int)`, `atacado_cart_remove_item(p_id uuid)`, `atacado_cart_clear()`, `atacado_my_orders()`, `admin_list_revendedores(p_status text)`, `admin_upsert_revendedor(p_id uuid, p_razao_social text, p_cnpj text, p_responsavel text, p_email text, p_whatsapp text, p_cidade text, p_uf text)`, `admin_set_revendedor_status(p_id uuid, p_status revendedor_status)`.

- [ ] **Step 1:** `revendedores(id uuid pk default gen_random_uuid(), user_id uuid unique references auth.users on delete set null, razao_social text not null, cnpj text, responsavel text not null default '', email text not null check (email = lower(email)), whatsapp text not null default '', cidade text not null default '', uf text not null default '', status revendedor_status not null default 'pendente', created_at, reviewed_at, reviewed_by uuid)`; índice único parcial em `email`. RLS ligado; policy `revendedores_self_select` (`user_id = auth.uid()`). `carrinho_atacado` exatamente como spec-mãe §5.4 (chave `revendedor_id` → `revendedores(id)`), RLS ligado, policy de `select` própria via join no `user_id`.
- [ ] **Step 2:** Estender `handle_auth_user()` (Task 1) **neste arquivo** com `create or replace`: quando `tipo = 'revendedor'`, após criar o perfil, localizar `revendedores` por e-mail (cadastro manual feito pelo admin) e preencher `user_id`, **ou** inserir nova linha `pendente` com os metadados (`razao_social`, `cnpj`, `nome`→`responsavel`, `whatsapp`). Quando o e-mail já existe em `revendedores` e o usuário não declarou `tipo`, vincular `user_id` e definir papel `revendedor`. Idempotente.
- [ ] **Step 3:** `atacado_me()` retorna `{ id, status, razao_social }` do chamador ou null. `atacado_cart_*` exigem revendedor `aprovado` (erro `'revendedor não aprovado'`); `set_item` com quantidade 0 remove, valida que `size_id` pertence a `color_id` e este a `product_id`, e **não** valida estoque (aviso é leitura); `atacado_cart_get` devolve itens com nome, cor, tamanho, imagem, `preco_atacado` calculado no servidor via `_preco_atacado`, `estoque` atual e `sku_distintos`. `atacado_my_orders()` lista pedidos `is_atacado` do `revendedor_id` do chamador.
- [ ] **Step 4:** `admin_list_revendedores`/`upsert`/`set_status`: listar e editar → `{superadmin,admin,supervisor}`; `set_status` → `{superadmin,admin}`; gravar `reviewed_at`/`reviewed_by`. Remover referências à tabela antiga de duas colunas.
- [ ] **Step 5:** `checkout_iniciar_pedido`: **não alterar nesta tarefa**; a Task 9 trata do atacado no checkout. Policies `SELECT` em `orders`/`order_items` para `authenticated` onde `customer_id = auth.uid()` (spec-mãe §5.5).
- [ ] **Step 6:** Revisão de segurança do próprio SQL (mesma lista do Step 5 da Task 1). Commit `feat(db): atacado, revendedores e carrinho persistente`.

### Task 8: Migração 0007 — textos, banner, promoções, imagem de categoria, lançamentos

**Files:**
- Create: `supabase/migrations/0007_cms_textos_promos.sql`

**Interfaces (Produces):** `textos_loja`, `banner_hero`, `promocoes`; colunas `categorias.imagem text`, `products.created_at timestamptz not null default now()`; RPCs `get_textos()` (pública), `admin_set_textos(p_valores jsonb)`, `get_banner_hero()` (pública, só publicado), `admin_get_banner_hero()` (rascunho+publicado), `admin_save_banner_rascunho(p_dados jsonb)`, `admin_publish_banner()`, `admin_discard_banner()`, `admin_list_promocoes()`, `admin_upsert_promocao(...)`, `admin_delete_promocao(p_id)`, `_desconto_efetivo(p_produto products)`; atualização de `categorias` nas RPCs `admin_upsert_categoria` (parâmetro `p_imagem`).

- [ ] **Step 1:** `textos_loja(chave text primary key, valor text not null)` com RLS ligado e **sem** policy; `get_textos()` devolve jsonb `{chave: valor}`; seed com os textos do design: `aviso.texto`="FRETE GRÁTIS ACIMA DE R$ 299 · TROCA FÁCIL EM 30 DIAS", `aviso.ativo`="true", `rodape.descricao`="Calçados e acessórios.", `rodape.ajuda1_texto/ajuda1_link` (“Trocas e devoluções”), `ajuda2_*` (“Prazos de entrega”), `ajuda3_*` (“Fale com a gente”; links vazios = usar WhatsApp), `revendedora.etiqueta`="ATACADO LOLA", `revendedora.titulo`="Seja revendedora LOLA.", `revendedora.texto`="Preço de atacado a partir de 12 modelos diferentes. Cadastro com CNPJ, aprovação rápida.", `revendedora.botao`="Quero ser revendedor", `home.categorias_titulo`="Categorias", `home.lancamentos_etiqueta`="ACABOU DE CHEGAR", `home.lancamentos_titulo`="Lançamentos", `login.etiqueta`="COLEÇÃO VERÃO 26", `login.titulo`="Pisa confiante." `admin_set_textos` exige `{superadmin,admin}`, faz upsert apenas de chaves **já conhecidas** (rejeita chaves novas) com limite de 500 caracteres por valor.
- [ ] **Step 2:** `banner_hero` (linha única `id = 1`, colunas `rascunho jsonb`, `publicado jsonb`, `publicado_em timestamptz`); seed `publicado` = `{etiqueta:"COLEÇÃO VERÃO 26", titulo:"Pisa confiante.", subtitulo:"Tênis, sandálias e bolsas pra quem já sabe onde quer chegar.", cta1_texto:"Ver coleção", cta1_link:"#lancamentos", cta2_texto:"Comprar por categoria", cta2_mostrar:true, imagem:null}`. `rascunho` nulo = sem alterações pendentes. RPCs de banner → `{superadmin,admin}`; `publish` copia rascunho→publicado e zera rascunho; `discard` zera rascunho. Limite de tamanho do JSON de `imagem` (base64) por validação de `length` (≤ 3 MB de texto).
- [ ] **Step 3:** `promocoes(id uuid pk, nome text not null, desconto_percentual int not null check (between 1 and 90), aplica_a_categoria_id uuid references categorias on delete cascade null, inicio date null, fim date null, cupom text null, ativa boolean not null default true, created_at)` — `aplica_a_categoria_id` nulo = loja inteira. RLS ligado sem policy. RPCs admin → `{superadmin,admin}`. `_desconto_efetivo(produto)` = maior entre `desconto_percentual` do produto e o maior desconto de promoção **ativa, sem cupom, dentro da janela de datas (hoje no fuso `America/Fortaleza`)** que se aplica à categoria do produto ou à loja; retorna int ou null. Atualizar `_preco_varejo` e `_product_json` (devem expor `desconto_efetivo`) e **`checkout_iniciar_pedido`** para usar o desconto efetivo ao calcular `preco_unit` de varejo; atacado continua ignorando qualquer desconto de varejo (spec-mãe §7). Reler o corpo atual de `checkout_iniciar_pedido` em `0002` e reproduzir com a única mudança necessária.
- [ ] **Step 4:** `categorias.imagem` (nullable) e exposição no `select` público (já é `select *`); `admin_upsert_categoria` ganha `p_imagem text default null`. `products.created_at`.
- [ ] **Step 5:** Revisão de segurança do SQL. Commit `feat(db): textos, banner, promoções e lançamentos`.

### Task 9: Preço efetivo e textos no app (`lib/pricing.ts`, `lib/textos.ts`) + checkout atacado

**Files:**
- Create: `lib/pricing.ts`, `lib/textos.ts`, `__tests__/pricing.test.ts`, `__tests__/textos.test.ts`
- Modify: `lib/types.ts`, `app/checkout/actions.ts`, `app/checkout/page.tsx`, `components/ProductCard.tsx`, `components/ProductDetail.tsx`, `lib/cart.tsx` (somente o necessário)
- Create: `supabase/migrations/0008_checkout_atacado.sql`

**Interfaces:**
```ts
// lib/pricing.ts
export function precoVarejoEfetivo(p: { preco: number; desconto_efetivo?: number | null }): { final: number; original: number; pct: number | null };
export function precoAtacado(p: { preco: number; preco_atacado: number | null }, categoria: { desconto_atacado_percentual: number | null } | null): number;
export function skusDistintos(itens: { product_id: string; color_id: string; size_id: string }[]): number;
export const MIN_SKUS_ATACADO = 12;
// lib/textos.ts
export const TEXTOS_PADRAO: Record<string, string>; // todas as chaves do seed da Task 8
export async function getTextos(): Promise<Record<string,string>>; // get_textos() mesclado com TEXTOS_PADRAO; falha → padrão
```

- [ ] **Step 1:** Testes de `pricing` (varejo com e sem desconto efetivo, arredondamento a 2 casas, atacado override > % da categoria > preço de tabela, atacado ignora desconto de varejo, `skusDistintos` conta combinações produto+cor+tamanho ignorando quantidade) e de `textos` (merge preserva padrão para chave ausente; valor vazio no banco cai no padrão). Rodar → falha → implementar → verde.
- [ ] **Step 2:** `ProductCard`/`ProductDetail`/`checkout`: exibir preço via `precoVarejoEfetivo`; o servidor continua sendo a fonte do valor cobrado.
- [ ] **Step 3:** `0008_checkout_atacado.sql`: `create or replace function checkout_iniciar_pedido(...)` com a mesma assinatura e comportamento da versão da Task 8, acrescentando, quando `p_is_atacado = true`: `auth.uid()` deve corresponder a revendedor `aprovado` (ignora `p_revendedor_id` vindo do cliente e usa o do `auth.uid()`), lê os itens de `carrinho_atacado` do servidor (não do payload), recalcula `preco_unit` com `_preco_atacado`, confere estoque por linha, exige `count(distinct (product_id,color_id,size_id)) >= 12`, grava `orders.revendedor_id`/`is_atacado` e, no sucesso, **não** limpa o carrinho (o webhook limpa após pagamento — acrescentar chamada a `atacado_cart_clear_for(p_revendedor uuid)` dentro de `_settle_order` quando `is_atacado`). Atualizar `_settle_order` mínimamente para isso.
- [ ] **Step 4:** `app/checkout`: para revendedor aprovado, entrada pelo carrinho atacado (`/atacado/carrinho` → `/checkout?modo=atacado`); a action envia `p_is_atacado = true` sem itens (o servidor usa o carrinho do banco).
- [ ] **Step 5:** `npm test`, `lint`, `build`. Commit `feat: preço efetivo, textos e checkout de atacado`.

### Task 10: Header e rodapé do design

**Files:**
- Modify: `components/Header.tsx`, `components/PaymentsFooter.tsx`, `app/layout.tsx` (se necessário para carregar textos), `app/globals.css`
- Create: `components/home/AvisoBar.tsx`

**Interfaces:** Consome `getTextos()` (Task 9), `getPerfil()` (Task 4), `useCart` existente. `Header` recebe `categorias: {slug,nome}[]`, `perfil: {nome,papel} | null`, `textos`.

- [ ] **Step 1:** Ler “Header” e “Footer” em `LOLA Vitrine Home.dc.html`. Recriar: `AvisoBar` (fundo `#2B2420`, Martian Mono 11px, oculta se `aviso.ativo !== "true"`); header sticky branco com borda `#EFE0DB`, logo (`/lola-logo.png`, 36px de altura), nav = categorias reais + “Lançamentos” (`#C4416F`, âncora `/#lancamentos`) em desktop, hambúrguer em mobile (manter o comportamento atual de abrir o menu), ícones `User` e `ShoppingBag` do `lucide-react`; **sem** lupa. Conta: deslogado → `/entrar`; logado → menu simples (nome, “Minha conta”, “Painel” se equipe, “Painel de atacado” se revendedor, “Sair”). Contador da sacola pêssego (`--brand-orange` como hoje).
- [ ] **Step 2:** Rodapé: colunas Loja / Ajuda / Conta do design, textos de `getTextos()`, links de Ajuda sem destino apontam para `BRAND.whatsappUrl`; manter o selo “Compra segura / Parceria oficial Mercado Pago” e `© ano`. Remover o wordmark gigante apenas se o design não o tiver (o design não tem: remover).
- [ ] **Step 3:** Todas as páginas existentes (`/produto`, `/carrinho`, `/checkout`, `/pedido`, `/minha-conta`, `/surpresa`) continuam renderizando com o novo `Header`/`SiteFooter`; ajustar as chamadas conforme necessário (o Header deixa de ser autônomo: criar um wrapper server `SiteHeader` que busca categorias/perfil/textos e renderiza o client `Header`).
- [ ] **Step 4:** 390px e 1280px sem rolagem horizontal; navegação por teclado com foco visível. `build`, `lint`. Commit `feat: header, aviso e rodapé do novo design`.

### Task 11: Home do design

**Files:**
- Modify: `app/page.tsx`
- Create: `components/home/Hero.tsx`, `components/home/Categorias.tsx`, `components/home/Lancamentos.tsx`, `components/home/BannerRevendedora.tsx`
- Delete (se ficarem sem uso): `components/HeroCarousel.tsx`, `components/TrustStrip.tsx`, `components/BrandStory.tsx`, `components/CategoryChips.tsx`

**Interfaces:** Consome `getTextos()`, RPC pública `get_banner_hero()`, `precoVarejoEfetivo`, `SwingTag`, `ProductCard` (para a grade “Todos os produtos”).

- [ ] **Step 1:** Ler a Home no `.dc.html`. `Hero`: full-bleed `#FFE4EC`, altura `min(78vh,720px)` (560px mobile), foto do banner (`imagem` base64) cobrindo o fundo, texto escuro embaixo à esquerda (etiqueta mono 12px, título `clamp(40px,7cqw,84px)` peso 700, subtítulo, CTAs pêssego e branco-com-borda), conteúdo de `get_banner_hero()` com fallback aos padrões; CTA2 oculto se `cta2_mostrar` falso.
- [ ] **Step 2:** `Categorias`: grid auto-fill (min 180px; 140px mobile), cartão 4:5 raio 16 com `categorias.imagem` ou bloco tingido (ciclar `#FFE4EC,#DDF7EE,#EFE0DB,#EEE5FF,#FFEBDA`), nome + seta; link para `/#cat-<slug>` (âncora da grade abaixo). Só categorias com produto em estoque.
- [ ] **Step 3:** `Lancamentos` (client): 8 produtos ativos com estoque ordenados por `created_at desc`; carrossel `scroll-snap-x`, setas ←/→ rolando 80% da largura (usar `scrollBy` com `behavior: "smooth"`, respeitando `prefers-reduced-motion`); cartão 3:4, `SwingTag` “NOVO” menta, favorito ♡/♥ persistido em `localStorage` (envolto em try/catch), categoria, nome, preço mono + “ou 3x” (`preço/3`), swatches das cores reais; cartão é link para `/produto/<slug>`.
- [ ] **Step 4:** `BannerRevendedora`: bloco menta raio 24, textos de `getTextos()` (`revendedora.*`), botão escuro → `/entrar?modo=revendedor`, imagem lateral opcional (bloco tingido). Abaixo, seção “Todos os produtos” reaproveitando `GrupoSection`/`ProductCard` por grupo (calçados/acessórios) com ids `calcados`, `acessorios` e âncoras `cat-<slug>` por categoria, para que os links de navegação funcionem.
- [ ] **Step 5:** Estados vazios (sem produtos, sem lançamentos) com a mensagem existente; sem emojis; imagens com `alt`. `build`, `lint`. Commit `feat: nova Home da vitrine`.

### Task 12: Admin — sidebar agrupada, drawer, Textos da loja e Banner do hero

**Files:**
- Modify: `components/admin/AdminSidebar.tsx`, `components/admin/AdminApp.tsx`, `app/admin/actions.ts`
- Create: `components/admin/Drawer.tsx`, `components/admin/Toast.tsx`, `components/admin/TextosTab.tsx`, `components/admin/BannerTab.tsx`

**Interfaces:** `Drawer({ aberto, kicker, titulo, onFechar, rodape })`; actions novas: `fetchTextos`, `saveTextos(valores)`, `fetchBanner`, `saveBannerRascunho`, `publishBanner`, `discardBanner`. `AdminScreen` ganha `"promocoes" | "banner" | "textos" | "usuarios"`.

- [ ] **Step 1:** Sidebar com os 4 grupos do README (rótulos Martian Mono 10px) mostrando só `telasVisiveis(papel)`; ativo = `#FFF3E8`/`#C46A1F` com a borda laranja existente.
- [ ] **Step 2:** `Drawer` conforme README (460px à direita, overlay 35%, `Esc` fecha, foco preso e devolvido ao fechar, `role="dialog"` e `aria-modal`), `Toast` escuro centralizado com auto-fechar 3 s.
- [ ] **Step 3:** `TextosTab`: grupos e chaves do seed da Task 8 em um formulário único, botão “Salvar textos” (desabilitado sem mudanças), toast “Textos salvos”, aviso de limite de 500 caracteres.
- [ ] **Step 4:** `BannerTab`: formulário à esquerda e prévia 16:10 ao vivo à direita (usar o mesmo componente visual do `Hero` da Task 11 em escala), upload de foto (arquivo → base64 redimensionado a ≤ 1600px de largura via canvas, JPEG 0.82, validar tipo e ≤ 3 MB), status “Alterações não publicadas”/“Publicado na vitrine”, botões Descartar e “Publicar na vitrine”.
- [ ] **Step 5:** `build`, `lint`. Commit `feat(admin): sidebar agrupada, drawer, textos e banner`.

### Task 13: Admin — Promoções, Usuários, Revendedores completos e editor de produto no drawer

**Files:**
- Create: `components/admin/PromocoesTab.tsx`, `components/admin/UsuariosTab.tsx`
- Modify: `components/admin/RevendedoresTab.tsx`, `components/admin/ProdutosTab.tsx`, `components/admin/ProductEditor.tsx`, `components/admin/CategoriasTab.tsx`, `app/admin/actions.ts`

**Interfaces:** actions `fetchPromocoes/savePromocao/deletePromocao`, `fetchUsuarios/saveUsuario/inviteUsuario/fetchConvites/deleteConvite`, `Revendedor` ampliado (razao_social, cnpj, responsavel, email, whatsapp, cidade, uf, status, created_at), `saveRevendedor`, `setRevendedorStatus`. Regras de UI de gestão via `podeGerirPapel`, `podeAprovarRevendedor`, `podeEditarRevendedor`.

- [ ] **Step 1:** `PromocoesTab` (ler a tela no `.dc.html`): colunas Promoção (+cupom mono lilás), Desconto (chip), Aplica a, Período `dd/mm → dd/mm`, Ativa (toggle 36×20, off `#EFE0DB`, on `#8FE3C8`), Editar; “+ Criar promoção” abre o `Drawer`; validação nome*/desconto 1–90*; excluir com confirmação. Nota fixa no drawer: “Cupom ainda não é aplicado no checkout.”
- [ ] **Step 2:** `UsuariosTab`: filtro por papel, tabela nome (avatar inicial), e-mail, papel (chips: superadmin pêssego, admin pêssego claro, supervisor lilás, cliente rosa, revendedor menta), último acesso, status, Editar; “+ Adicionar usuário” cria **convite**; seção “Convites pendentes” com remover. Os papéis oferecidos no seletor respeitam `podeGerirPapel` do ator; o servidor revalida. Mensagem de erro do banco traduzida.
- [ ] **Step 3:** `RevendedoresTab`: manter a tabela do PR atual e adicionar campos do drawer (razão social*, CNPJ com máscara, responsável, e-mail, WhatsApp com máscara, cidade/UF, status); Aprovar/Recusar só para quem `podeAprovarRevendedor`; supervisor vê botões ocultos. Swing tag “Cadastro pendente” só enquanto pendente; depois texto discreto “Aprovado”/“Recusado”.
- [ ] **Step 4:** Reapresentar o editor de produto atual (`ProductEditor`, cores × tamanhos × imagens) dentro do `Drawer` (460px; se o conteúdo exigir, permitir largura maior apenas para este drawer, `min(720px, 100vw)`), **preservando toda a lógica existente**; “+ Cadastrar produto” e “Editar” abrem o drawer. Adicionar campo “Imagem da categoria” (upload base64 ≤ 800px) em `CategoriasTab`.
- [ ] **Step 5:** `build`, `lint`, `test`. Commit `feat(admin): promoções, usuários, revendedores e drawer de produto`.

### Task 14: Área do atacado

**Files:**
- Create: `app/atacado/layout.tsx`, `app/atacado/page.tsx` (painel), `app/atacado/catalogo/page.tsx`, `app/atacado/carrinho/page.tsx`, `app/atacado/pedidos/page.tsx`, `app/atacado/actions.ts`, `components/atacado/AtacadoShell.tsx`, `components/atacado/GateStatus.tsx`, `components/atacado/CatalogoGrid.tsx`, `components/atacado/CarrinhoView.tsx`

**Interfaces:** Consome `atacado_me`, `atacado_cart_get/set_item/remove_item`, `atacado_my_orders` (Task 7), `precoAtacado`, `skusDistintos`, `MIN_SKUS_ATACADO` (Task 9), `exigirPapel(["revendedor"])`.

- [ ] **Step 1:** Ler `LOLA Revendedor Dashboard.dc.html` (telas e gate). `layout.tsx`: exige sessão com papel `revendedor` (equipe pode visualizar? **não**: só `revendedor`; equipe usa o admin). `AtacadoShell`: sidebar 232px com logo e rótulo mono “ATACADO”, itens Painel/Catálogo/Carrinho/Meus pedidos com ícones lucide, cartão do usuário e Sair.
- [ ] **Step 2:** Gate (`GateStatus`): `pendente` → logo + swing tag “Cadastro pendente” + texto curto; `recusado` → swing tag “Cadastro não aprovado”; sem seletor “Simular”; `aprovado` → app. Status vem de `atacado_me()` em toda página (server).
- [ ] **Step 3:** Painel: card de progresso “X de 12 SKUs” (barra gradiente pêssego→rosa) + “Ver carrinho”; KPIs (Pedidos no mês, Total comprado, Desconto atacado); Últimos pedidos; Novidades do catálogo. Dados de `atacado_my_orders` e do carrinho.
- [ ] **Step 4:** Catálogo: grid de 4 colunas (reflow), foto 160px, badge “Sem estoque”/“Só restam N”, preço de atacado mono; para escolher cor/tamanho, abrir seletor compacto (cor → tamanho com estoque) antes de adicionar; botão Adicionar → “No carrinho (n)” (menta) → “Sem estoque” (desabilitado). Chama `atacado_cart_set_item` via server action; revalidar.
- [ ] **Step 5:** Carrinho: linhas com foto, nome, cor/tamanho, preço/un, alerta “Só restam N”, −/qtd/+ (+ bloqueado no estoque), subtotal, remover; resumo (progresso de SKUs distintos, peças, total); “Finalizar pedido” desabilitado com “Faltam N SKUs para finalizar” enquanto `< 12` ou com alerta de estoque; habilitado leva a `/checkout?modo=atacado`.
- [ ] **Step 6:** Meus pedidos: tabela Pedido, SKUs, Data, Valor, Status (`SwingTag` via `corStatus`). Mobile 390px com cards empilhados conforme README.
- [ ] **Step 7:** `build`, `lint`, `test`. Commit `feat: área do revendedor (atacado)`.

### Task 15: Release — SQL único, smoke, documentação e verificação final

**Files:**
- Modify: `supabase/release-unico.sql` (reescrever), `README.md`, `docs/QA-fase1.md` (renomear para `docs/QA.md` e atualizar), `AGENTS.md` (trecho “Sobre este projeto”: auth e papéis)
- Create: `supabase/smoke.sql`

- [ ] **Step 1:** `release-unico.sql` = cabeçalho de instruções + conteúdo de `0004`…`0008` na ordem, + convite do dono `insert into convites_papel(email, papel) values (lower('<EMAIL_DO_DONO>'), 'superadmin') on conflict (email) do update set papel = excluded.papel;` com `DO $$` que **aborta** se o e-mail continuar `<EMAIL_DO_DONO>`. Os arquivos em `supabase/migrations/` permanecem como fonte; o release é gerado por concatenação (script `scripts/build-release-sql.mjs` que falha se um arquivo faltar) e nunca editado à mão.
- [ ] **Step 2:** `smoke.sql` somente leitura: existência das tabelas e funções esperadas (`to_regclass`, `to_regprocedure`), RLS ligado em todas as tabelas novas, ausência de qualquer função `admin_*` com parâmetro `p_secret`, `get_textos()` e `get_banner_hero()` retornando dados, contagem de `convites_papel`.
- [ ] **Step 3:** Documentação: README com seção “Lançamento” (ordem: configurar Auth no Supabase §4.3 do spec → rodar `release-unico.sql` → merge → criar conta com o e-mail do dono → rodar `smoke.sql` → QA), tabela de papéis, e remoção das menções a senha única. `docs/QA.md` com os itens do checklist antigo ajustados (login por e-mail/senha no lugar de “senha do seed”) + checklist novo (cadastro revendedor → aprovação → catálogo → carrinho 12 SKUs → pagamento; usuários e permissões por papel; banner publicar/descartar; textos).
- [ ] **Step 4:** Verificação final: `npm test`, `npm run lint`, `npm run build` limpos; `grep -rn "p_secret" app lib components` deve retornar vazio (exceto webhook, que usa `assert_webhook`); `grep -rn "assert_admin"` em SQL novo vazio; conferir que `git status` não tem arquivos soltos e que `.env*` não foi tocado.
- [ ] **Step 5:** Commit `chore: pacote de lançamento (SQL único, smoke e documentação)`. **Não fazer push.**

---

## Revisões

- Cada tarefa: revisor de tarefa (spec + qualidade). Tarefas 1, 2, 7, 8 (e o SQL de 9): revisor **dedicado de SQL e segurança** com checklist do Step 5 da Task 1, caça a escalonamento de privilégio, `search_path`, `grant/revoke`, e fidelidade de corpo às funções de `0002`.
- Final: uma revisão do branch inteiro com o modelo mais capaz, incluindo varredura de requisitos do spec (§4.4 linha por linha), regressões no checkout/webhook e varredura de `p_secret`.
- Todos os rulings e achados vão para o ledger do SDD (`.superpowers/sdd/2026-10-02-loja-lola-release-home-login-atacado/progress.md`).
