# Loja LOLA — Release único: Home, Login, Admin CMS e Atacado

Data: 2026-10-02 · Branch: `loja-lola-admin-dashboard` (PR #3) · Spec-mãe: `2026-09-09-loja-lola-design.md`

## 1. Objetivo e regra de entrega

Implementar o handoff do Claude Design inteiro (Vitrine Home, Login, Admin CMS, Revendedor) sobre a base já
existente, numa **única leva**: tudo é construído e aprovado localmente; depois um push, um merge (um deploy
na Vercel) e um único SQL no Supabase. Nada sobe antes da aprovação final do dono.

Referência de design (fonte de verdade visual; alta fidelidade):
`C:\Users\VOOA\Desktop\LOLA\LOLA Dashboards — Admin e Revendedor -atualizado\design_handoff_lola_dashboards\`
(`README.md`, `LOLA Vitrine Home.dc.html`, `LOLA Login.dc.html`, `LOLA Admin Dashboard.dc.html`,
`LOLA Revendedor Dashboard.dc.html`). Os `.dc.html` são protótipos: recriar no stack real, nunca portar `support.js`/`image-slot.js`.

Este spec **implementa** as Fases 2 e 3 do spec-mãe (§10, §11, §5.3–5.4, §6.4) e **sobrescreve** dele: a autenticação
do admin (§5.5, §6.3: `p_secret` → Supabase Auth com papéis) e o modelo de `revendedores` (§5.4: ganha campos do design).

## 2. Decisões já tomadas pelo dono

| Decisão | Escolha |
|---|---|
| Escopo | Tudo do handoff: Home, Login, Admin completo (Promoções, Usuários, Banner do hero), Revendedor |
| Autenticação | Supabase Auth para todos, inclusive admin/editor; fim da senha única |
| Google | Fora deste lançamento (sem botão) |
| Deploy | Um push, um merge, um SQL |

## 3. Decisões propostas (aprovar ou alterar na revisão do spec)

1. **Promoções**: desconto automático (sem cupom) aplicado ao preço de varejo na vitrine e recalculado no servidor no checkout; prevalece o **maior** entre desconto do produto e promoção ativa aplicável. O campo **cupom** é salvo e exibido no admin, mas **digitar cupom no checkout fica para depois** (mexe no pagamento; risco desproporcional ao lançamento).
2. **Papéis** (definidos pelo dono; o papel `editor` do design deixa de existir): `superadmin` (o dono do sistema), `admin` (a loja), `supervisor`, `revendedor`, `cliente`. Matriz na seção 4.4.
3. **“+ Adicionar usuário”** sem chave de serviço: grava um **convite** (e-mail + papel). Quando essa pessoa criar a conta com esse e-mail, recebe o papel. O dono entra do mesmo jeito: seu e-mail vai como convite `superadmin` no SQL de lançamento.
4. **Editor de produto**: mantém o editor atual (cores × tamanhos × imagens, que é o modelo real de dados), reapresentado no **drawer lateral de 460px** do design. O formulário simplificado do mockup (1 foto, 1 estoque) não substitui o modelo real.
5. **Busca** (ícone de lupa do header): fora do lançamento; o ícone não aparece até existir busca.
6. **Textos editáveis pelo admin** (decisão do dono): nada de copy fica fixo no código. Nova aba **“Textos da loja”** (§7) cadastra a barra de aviso, o rodapé (descrição e links de Ajuda), o banner “Seja revendedora”, os títulos das seções da Home e o texto do painel do Login. Os valores iniciais são os do design (“Frete grátis acima de R$ 299 · Troca fácil em 30 dias”, “Coleção Verão 26 / Pisa confiante.” etc.) e o dono os confirma/edita pela aba. Links de Ajuda sem página própria apontam para o WhatsApp por padrão.
7. **Favoritos (♡)**: persistidos em `localStorage` (sem backend).

## 4. Autenticação e papéis

### 4.1 Modelo
- `profiles(id uuid PK → auth.users, email, nome, papel, ativo bool default true, ultimo_acesso timestamptz, created_at)`; `papel ∈ ('superadmin','admin','supervisor','revendedor','cliente')`.
- `convites_papel(email PK normalizado minúsculo, papel)`.
- Trigger em `auth.users` (insert e update de confirmação): cria/atualiza `profiles`. Papel final = convite do e-mail, se existir **e o e-mail estiver confirmado**; senão `revendedor` quando `raw_user_meta_data.tipo = 'revendedor'`; senão `cliente`. **O papel nunca vem de metadado enviado pelo cliente** (anti-escalonamento). Papéis de equipe (`superadmin`, `admin`, `supervisor`) só por convite + e-mail confirmado.
- Se o convite chega depois de a conta existir, a RPC que cria o convite também atualiza o perfil existente.
- `assert_papel(variadic text[])` (ou equivalentes por nível): exige `auth.uid()` com `profiles.ativo` e `papel` dentro da lista. Cada RPC `admin_*` declara o conjunto exato conforme a matriz da §4.4. `SECURITY DEFINER`, `search_path = public, extensions`.
- RLS: `profiles` — `authenticated` lê só a própria linha; nenhuma escrita direta. `convites_papel` sem acesso direto.

### 4.4 Matriz de permissões (aplicada no banco por RPC **e** no menu/rotas do app)

| Área | superadmin | admin | supervisor |
|---|---|---|---|
| Visão geral | completa | completa | só contagens de pedidos/vendas e estoque baixo (sem valores de receita) |
| Pedidos (ver, mudar status) | sim | sim | sim |
| Vendas (lista de vendas) | sim | sim | sim, sem totais financeiros |
| Financeiro (KPIs, lançamentos, repasses) | sim | sim | **não** |
| Produtos, Categorias, Promoções | sim | sim | não |
| Banner do hero, Textos da loja | sim | sim | não |
| Revendedores: cadastrar e editar | sim | sim | **sim** |
| Revendedores: aprovar/recusar | sim | sim | não |
| Usuários: cadastrar/editar | todos os papéis | admin, supervisor, revendedor, cliente (nunca superadmin) | não |
| Config do sistema (taxa de entrega, WhatsApp, cidade) | sim | **não** | não |

Regras: só `superadmin` cria/edita/desativa `superadmin`; o `admin` cria, aprova e edita todos os demais papéis (inclusive outros admins); ninguém rebaixa ou desativa a si mesmo; sempre existe ao menos um `superadmin` ativo. “Admin não faz mudanças no sistema” = sem acesso a Config. Confirmado pelo dono: supervisor não aprova/recusa revendedor.

### 4.2 Sessão no Next
- Login/cadastro por server actions (`signInWithPassword`, `signUp`) guardando tokens em **cookies httpOnly**; helper server `authedSupabase()` envia `Authorization: Bearer <access_token>` e renova via refresh token quando expira. Nenhuma chave nova no ambiente (usa só a anon key).
- Todas as RPCs `admin_*` perdem `p_secret` e começam com `assert_papel(...)` conforme a matriz da §4.4. `admin_set_secret`, `loginAdmin` por senha e a troca de senha da ConfigTab são removidos (senha passa a ser do Supabase Auth). `webhook_secret_hash` e o fluxo do webhook **não mudam**.
- `app/admin/page.tsx`: sem sessão ou sem papel de equipe (`superadmin`/`admin`/`supervisor`) → redireciona para `/entrar?next=/admin`. Dados e abas são filtrados pelo papel.
- `profiles.ativo = false` encerra a sessão com mensagem.

### 4.3 Configuração manual no painel do Supabase (checklist do dono, não automatizável por mim)
Auth → Providers: e-mail ligado, **Confirm email = ON**, senha mínima 8. Auth → URL Configuration: Site URL = domínio de produção; Redirect URL = `<domínio>/entrar/redefinir`. Recomendado: SMTP próprio (o e-mail padrão do Supabase tem limite baixo de envios).

## 5. Login `/entrar` (design: `LOLA Login.dc.html`)
Modos `entrar | cadastro | revendedor | esqueci`, query `?modo=` e `?next=`. Layout split (foto à esquerda no desktop, só formulário no mobile). Validação inline idêntica ao protótipo (campos obrigatórios, e-mail, CNPJ com 14 dígitos, máscaras de CNPJ e WhatsApp). Sem botão/divisor Google. Remover rodapé “Demo” e o seletor Desktop/Mobile.
- `entrar` → sucesso: equipe (`superadmin`/`admin`/`supervisor`) → `/admin`; revendedor → `/atacado`; cliente → `next` ou `/`.
- `cadastro` → `signUp`; mensagem “Confirme seu e-mail para entrar”.
- `revendedor` → `signUp` com metadado `tipo='revendedor'` + dados da loja (razão social, CNPJ, nome, WhatsApp); trigger cria `revendedores` com `status='pendente'`. Mensagem do design: “Solicitação enviada. Seu cadastro está pendente de aprovação.” (+ confirmação de e-mail).
- `esqueci` → `resetPasswordForEmail`; página `/entrar/redefinir` define a nova senha.
- `Header`: ícone de conta vai para `/entrar` (deslogado) ou menu com Minha conta / Painel / Sair.

## 6. Home `/` (design: `LOLA Vitrine Home.dc.html`)
Substitui a Home atual (não os fluxos de produto, carrinho, checkout, pedido, surpresa).
1. Barra de aviso (texto de `textos_loja`, §7). 2. Header sticky branco: logo, nav = categorias reais + “Lançamentos” (#C4416F), conta, sacola com contador (existente). Ícones via `lucide-react` (não emojis).
3. Hero full-bleed: conteúdo vem do Banner do hero publicado (§8.2); fallback = texto do protótipo.
4. Categorias: grid 4:5 com `categorias.imagem` (nova coluna, editável em Categorias); sem imagem → bloco tingido do protótipo.
5. Lançamentos: carrossel scroll-snap com setas; = 8 produtos ativos, com estoque, mais recentes (`products.created_at`, nova coluna). Card: swing tag “NOVO” (menta, `SwingTag`), ♡, categoria, nome, preço mono + “ou 3x”, swatches das cores reais.
6. Banner “Seja revendedora LOLA” → `/entrar?modo=revendedor`. 7. Footer do design (substitui `SiteFooter` na Home e demais páginas, mantendo selo Mercado Pago).
Seções antigas (TrustStrip, Destaques, grupos Calçados/Acessórios, BrandStory) saem da Home; a grade completa por grupo permanece acessível pelas âncoras de categoria na própria Home via seção “Todos os produtos” abaixo dos Lançamentos (reaproveita `GrupoSection`). Tokens do `README` do handoff; o `--bg/--ink/...` do projeto já coincidem.

## 7. Admin CMS (design: `LOLA Admin Dashboard.dc.html`)
Sidebar agrupada: **Geral** (Visão geral, Pedidos, Financeiro) · **Catálogo** (Produtos, Promoções) · **Aparência** (Banner do hero, **Textos da loja**) · **Pessoas** (Revendedores, Usuários); Config no ícone do rodapé (modal existente, sem troca de senha, só `superadmin`). Itens e dados filtrados pelo papel (§4.4).
- **Textos da loja**: aba nova com formulário agrupado e salvamento único. Grupos e chaves: *Barra de aviso* (texto, mostrar sim/não); *Rodapé* (descrição, 3 links de Ajuda com texto + destino); *Banner revendedora* (etiqueta, título, texto, botão); *Home* (título e etiqueta de Categorias e de Lançamentos); *Login* (etiqueta e título sobre a foto). Tabela `textos_loja(chave pk, valor)` com valores iniciais do design, leitura pública via RPC `get_textos()`, escrita via RPC admin+. O código usa os textos do banco e cai nos valores iniciais se a chave não existir.
- **Drawer lateral compartilhado** (460px, overlay 35%, kicker NOVO/EDITAR, rodapé Excluir·Cancelar·Salvar, toast escuro) para produto (conteúdo do editor atual), revendedor, usuário, promoção.
- **Revendedores**: lista/aprovar/recusar conforme design; campos: razão social*, CNPJ, responsável, e-mail, WhatsApp, cidade/UF, status. “+ Cadastrar revendedor” cria registro sem conta (`user_id` nulo); é vinculado automaticamente quando a pessoa criar conta com o mesmo e-mail.
- **Promoções**: nome*, desconto %*, aplica a (loja inteira | categoria), início, fim, cupom (só armazenado, §3.1), ativa.
- **Usuários**: filtro por papel (Superadmin/Admin/Supervisor/Revendedor/Cliente); colunas nome, e-mail, papel, último acesso, status; editar papel/ativo; “+ Adicionar usuário” = convite (§3.3). Restrições da §4.4.
- **Banner do hero**: formulário + prévia 16:10 ao vivo, estados “Alterações não publicadas”/“Publicado na vitrine”, Descartar / Publicar. Foto enviada como base64, como as imagens de produto.
- Restante (Visão geral, Pedidos, Financeiro, Produtos, Categorias): já entregues no PR #3; só ganham o novo gate de autenticação e o drawer.

## 8. Backend novo (resumo)

### 8.1 Migrações (consolidadas em um único `supabase/release-unico.sql`, na ordem)
`0004` (substitui o `0004_revendedores.sql` atual, **nunca aplicado**): `profiles`, `convites_papel`, trigger, `assert_staff`/`assert_admin_only`, RPCs de usuários e convites.
`0005`: troca de todas as `admin_*` para autenticação por sessão (drop das assinaturas antigas com `p_secret`, recriação sem ele, mesma lógica).
`0006`: `revendedores` (campos do §7; `user_id` único nulo → `auth.users`), `carrinho_atacado`, RPCs `atacado_signup`/`atacado_me`/`atacado_cart_*` (spec-mãe §6.4), `admin_*revendedor*`, `admin_set_destaque`; RLS do spec-mãe §5.5; policies `SELECT` de `orders`/`order_items` por `customer_id = auth.uid()`.
`0007`: `textos_loja` (+ seed do design, `get_textos()` pública, `admin_set_textos`); `promocoes` + RPCs admin; função de preço efetivo usada por `checkout_iniciar_pedido` (revalida no servidor, nunca confia no preço do cliente); `banner_hero` (`rascunho` e `publicado` em jsonb, sem policy pública) + `get_banner_hero()` pública + RPCs admin; `categorias.imagem`; `products.created_at`.
Convite do dono: `insert into convites_papel values ('<EMAIL_DO_DONO>','superadmin')` com validação de placeholder (padrão do `release-unico.sql` atual).

### 8.2 Segurança (revisão obrigatória específica)
Todas `SECURITY DEFINER` com `search_path = public, extensions`; nenhuma função aceita papel/uid do cliente; `profiles` não escrevível; sem `select` público em tabelas novas (exceto via RPC pública `get_banner_hero`); revalidação no servidor de preço, estoque, status de revendedor e mínimo de 12 SKUs distintos no checkout atacado.

## 9. Atacado (design: `LOLA Revendedor Dashboard.dc.html`; regras no spec-mãe §11)
Rotas `/atacado` (painel; gate por `atacado_me()`: pendente/recusado → tela do design com swing tag; aprovado → app), `/atacado/catalogo` (preço de atacado), `/atacado/carrinho` (persistente no servidor, progresso “X de 12 SKUs”, alerta de estoque por linha, “Finalizar” bloqueado até 12 SKUs distintos), `/atacado/pedidos`. Finalizar usa o `/checkout` e a mesma action com `p_is_atacado = true`; webhook limpa o carrinho após pagamento aprovado. Layout: sidebar 232px com rótulo “ATACADO”, KPIs, como no design.

## 10. Testes e verificação
- Vitest (puro): máscaras e validação de CNPJ/WhatsApp, roteamento por papel, preço efetivo (produto × promoção × atacado), regra de 12 SKUs, filtro de menu por papel, mapeamento de erros de auth.
- `npm run build` + `npm run lint` + `npm test` verdes a cada tarefa e no fim.
- **SQL não executável neste ambiente** (o conector Supabase da sessão aponta para outro projeto): mitigação = revisor dedicado de SQL/segurança por migração + `supabase/smoke.sql` (somente leitura) para o dono rodar após o SQL de lançamento.
- Verificação visual: o preview local não alcança o Supabase; a conferência visual é feita no deploy de preview da Vercel antes do merge se o dono preferir, ou após o merge.

## 11. Faseamento (tudo na mesma branch; revisão por tarefa + revisão final do branch)
F1 Autenticação (migração 0004, sessão, `/entrar`, redefinir, Header) · F2 Admin por sessão (migração 0005, actions, gate, remoção da senha) · F3 Home + banner/categorias/created_at (parte da 0007) · F4 CMS: sidebar agrupada, drawer, Banner do hero, Promoções, Usuários, Revendedores completos · F5 Atacado (0006 + rotas) · F6 Release: `release-unico.sql` consolidado, `smoke.sql`, README e `docs/QA-fase1.md` atualizados, verificação final.

## 12. Fora de escopo
Login com Google; cupom no checkout; busca; vincular pedidos antigos de convidados a contas; páginas de políticas (trocas, prazos); upload de imagem em storage (segue base64); notificações por e-mail além das do Supabase Auth.

## 13. Riscos
1. Reescrita de autenticação do admin é a parte mais sensível; mitigada pela revisão específica e pelo smoke test. Rollback = não mergear (nada sobe antes da aprovação).
2. Janela entre rodar o SQL e o deploy: o admin do site atual (senha) deixa de funcionar por minutos; aceitável pois a loja ainda não está em uso. Rodar o SQL e mergear em sequência.
3. SMTP padrão do Supabase pode limitar e-mails de confirmação em produção (§4.3).
4. Mercado Pago em produção real: QA de pagamento continua exigindo compra real de valor baixo.
