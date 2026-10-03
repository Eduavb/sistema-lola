# Loja LOLA

Ecommerce de calçados e acessórios: vitrine (Home com banner, categorias e
lançamentos), página de produto, carrinho, checkout com Mercado Pago (Pix e
cartão), acompanhamento do pedido, `/minha-conta`, `/surpresa`, login por
e-mail e senha (`/entrar`), área de **atacado** para revendedores aprovados
(`/atacado`) e painel `/admin` com permissões por papel (Pedidos, Financeiro,
Produtos, Promoções, Banner do hero, Textos da loja, Revendedores, Usuários, Config).

## Lançamento

Faça os passos **nesta ordem**. O SQL único (`supabase/release-unico.sql`) cobre
as migrações 0004 a 0008; as 0001 a 0003 já estão no banco de produção.

1. **Configurar o Auth no Supabase** (Authentication):
   - Providers > Email: ligado, **Confirm email = ON** (bloqueante: sem isso
     qualquer pessoa poderia assumir o papel de um e-mail convidado) e senha
     mínima de 8 caracteres.
   - URL Configuration: **Site URL** = `https://<seu-domínio>`.
   - **Redirect URLs** (exatas, sem curinga `*` ou `**`):
     `https://<seu-domínio>/entrar` e `https://<seu-domínio>/entrar/redefinir`.
   - Recomendado: SMTP próprio (o e-mail padrão do Supabase tem limite baixo de envios).
2. **Variáveis na Vercel** (Project Settings > Environment Variables), além das
   da seção "Setup local": defina `NEXT_PUBLIC_SITE_URL=https://<seu-domínio>`
   (obrigatória no lançamento: monta os links de confirmação de e-mail e de
   redefinição de senha). Faça redeploy depois de salvar.
3. **Criar a conta do dono, somente pelo painel**: Supabase > Authentication >
   Users > **Add user**, com o e-mail do dono, uma senha forte e "Auto Confirm
   User" marcado (não use o cadastro público de `/entrar` para o dono). O
   caminho preferido é fazer isto **ANTES** de rodar o SQL (janela zero). Se o
   Add user disser que o e-mail já existe, apague essa conta e crie de novo;
   **NUNCA** envie magic link ou recuperação de senha para uma conta não confirmada.

   **BLOQUEANTE (anti sequestro de conta):** antes de rodar o SQL e antes de
   **cada convite de equipe**, abra Authentication > Users e, se existir uma
   conta **não confirmada** com o e-mail do dono ou do funcionário, **apague-a**.
   Qualquer pessoa pode pré-cadastrar um e-mail alheio com a própria senha; o
   trigger só aplica convite de equipe a conta criada **depois** do convite, mas
   a conta antiga não confirmada deve sumir para o dono/funcionário recriá-la.

   Pode ser antes ou depois do passo 4: o bloco final do SQL cobre os dois casos
   (promove a conta existente e confirmada, ou deixa um convite de uso único que
   a torna `superadmin` quando a conta for criada com Auto Confirm).
4. **Rodar o SQL**: abra `supabase/release-unico.sql`, troque
   `SEU_EMAIL_AQUI@exemplo.com` pelo e-mail do dono (só na linha `v_email` do
   bloco final) e cole o arquivo inteiro no SQL Editor do projeto LOLA. Rode uma
   vez. O bloco aborta se o e-mail não for trocado. **Nunca reaplique** `0002` ou
   `0007` depois do `0008`. O arquivo é gerado: se alterar uma migração, rode
   `npm run release:sql`.
5. **Mergear o PR** (o deploy novo já espera o esquema do passo 4). **Janela de
   indisponibilidade:** entre rodar o SQL e o deploy publicar, o admin antigo e
   o checkout atual falham (as assinaturas antigas foram removidas). Rode o SQL
   e mergeie em seguida, em horário de pouco movimento.
6. **Rodar `supabase/smoke.sql`** (somente leitura) no SQL Editor. Todas as linhas
   devem vir com `ok = true`; "superadmin ativo" só pode estar `false` se a conta
   do dono ainda não foi criada/confirmada.
7. **Passada de QA** em [`docs/QA.md`](docs/QA.md) (inclui o item bloqueante
   "Confirm email = ON").
8. Itens de pré-lançamento que continuam valendo:
   - Definir o WhatsApp real em `lib/brand.config.ts` (`BRAND.whatsapp`, só
     dígitos com DDI 55); é o destino dos links de contato do site.
   - Rotacionar o `ADMIN_WEBHOOK_SECRET` se ele passou pelo histórico do git:
     gerar um novo, atualizar a env var na Vercel e rodar
     `set search_path = public, extensions; update admin_config set webhook_secret_hash = crypt('<novo-webhook-secret>', gen_salt('bf', 10)) where id = 1;`
   - Registrar o webhook `https://<domínio>/api/webhook/mercadopago` no Mercado
     Pago (evento `payment`).
   - Configurar `NTFY_TOPIC` (string longa aleatória) na Vercel e assinar o
     tópico no app ntfy.

### Papéis e acessos

Papéis: `superadmin` (o dono do sistema), `admin` (a loja), `supervisor`,
`revendedor` e `cliente`. O papel vive em `profiles` e nunca vem do cliente; as
RPCs `admin_*` validam a sessão e o papel no banco (`assert_papel`).

| Área | superadmin | admin | supervisor |
|---|---|---|---|
| Visão geral | completa | completa | só contagens de pedidos/vendas e estoque baixo (sem valores de receita) |
| Pedidos (ver, mudar status) | sim | sim | sim |
| Vendas (lista de vendas) | sim | sim | sim, sem totais financeiros |
| Financeiro (KPIs, lançamentos, repasses) | sim | sim | não |
| Produtos, Categorias, Promoções | sim | sim | não |
| Banner do hero, Textos da loja | sim | sim | não |
| Revendedores: cadastrar e editar | sim | sim | sim |
| Revendedores: aprovar/recusar | sim | sim | não |
| Usuários: cadastrar/editar | todos os papéis | admin, supervisor, revendedor, cliente (nunca superadmin) | não |
| Config do sistema (taxa de entrega, WhatsApp, cidade) | sim | não | não |

Regras: só `superadmin` cria, edita ou desativa `superadmin`; ninguém rebaixa ou
desativa a si mesmo; sempre existe ao menos um `superadmin` ativo. Convites de
papel são de uso único e só valem com e-mail confirmado. `revendedor` acessa o
atacado somente com cadastro **aprovado**; `cliente` compra e vê os próprios pedidos.

Notas: (a) se um funcionário criou a conta antes do re-convite e o admin
re-convidou, a confirmação não promove: promova em Usuários. (b) Dívida aceita:
o vínculo automático de um revendedor cadastrado manualmente no admin à conta
com o mesmo e-mail não tem regra de data; antes de cadastrar um revendedor
manualmente, confira em Authentication > Users e apague contas não confirmadas
com aquele e-mail.

Para **revogar o atacado** de alguém, recuse o cadastro em Revendedores (mudar o
papel em Usuários não corta o atacado).

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4
- Supabase (Postgres + Auth) via `@supabase/supabase-js` — catálogo por query
  direta (RLS libera `SELECT` anônimo); textos, banner e o restante por RPCs
  `SECURITY DEFINER` que validam o papel pela sessão (`assert_papel`)
- Mercado Pago (Checkout Pro) para pagamento; webhook em `/api/webhook/mercadopago`
- [ntfy](https://ntfy.sh) para notificação push de venda
- Vitest para testes unitários
- Deploy na Vercel

## Pré-requisitos

- Node.js 20+
- Um projeto Supabase (plano free serve)
- Uma conta na Vercel
- Uma conta no Mercado Pago (com credenciais de produção para receber pagamento real)

## Setup local

1. Instalar dependências:

   ```bash
   npm install
   ```

2. Criar o `.env.local` a partir do exemplo e preencher:

   ```bash
   cp .env.local.example .env.local
   ```

   | Variável | Onde obter |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → **Project URL** |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → **Project API keys → `anon` `public`** |
   | `MP_ACCESS_TOKEN` | Mercado Pago → Suas integrações → credenciais → **Access Token** (server-only) |
   | `NTFY_TOPIC` | String aleatória longa que você inventa (ex.: 40+ caracteres). É o nome do tópico ntfy; quem souber recebe as notificações, então trate como segredo (server-only) |
   | `ADMIN_WEBHOOK_SECRET` | Definido na migration de seed `0003` (ver abaixo); entregue ao operador fora do repositório (server-only) |
   | `NEXT_PUBLIC_SITE_URL` | URL pública do site (ex.: `https://loja-lola.vercel.app`). Obrigatória no lançamento (links de confirmação de e-mail e de redefinição de senha); em dev pode ficar vazia |

   O acesso ao `/admin` é por e-mail e senha do Supabase Auth, conforme o papel
   do usuário (ver "Papéis e acessos"); não há senha em variável de ambiente.

## Migrations

Fonte em `supabase/migrations/`. Produção já tem `0001` a `0003`. O lançamento
aplica `0004` a `0008` de uma vez pelo `supabase/release-unico.sql` (gerado por
`npm run release:sql`; ver "Lançamento"). Banco novo e vazio: rode `0001`,
`0002` e `0003` no SQL Editor (no `0003`, substitua os placeholders por valores
reais; o webhook secret é o `ADMIN_WEBHOOK_SECRET` do ambiente) e depois o
`release-unico.sql`. Nunca reaplique `0002`/`0007` depois do `0008`.

## Scripts

```bash
npm run dev          # desenvolvimento em http://localhost:3000
npm run build        # build de produção
npm test             # testes unitários (Vitest)
npm run lint         # ESLint (deve sair com 0 erros)
npm run release:sql  # regenera supabase/release-unico.sql a partir das migrações 0004-0008
```

## Deploy (Vercel)

1. Suba o repositório para o GitHub.
2. Na Vercel, **Import Project** apontando para o repo.
3. Em **Project Settings → Environment Variables**, defina todas as variáveis do
   `.env.local` (as `NEXT_PUBLIC_*` e as server-only). Use as credenciais de
   **produção** do Mercado Pago se for receber pagamento real.
4. Faça o deploy.
5. No **painel do Mercado Pago**, em Webhooks / Notificações, registre a URL:

   ```
   https://<seu-domínio>/api/webhook/mercadopago
   ```

   Assine o evento de pagamento (`payment`).
6. No app **ntfy** (celular ou web), inscreva-se no tópico igual ao valor de
   `NTFY_TOPIC` para receber as notificações de venda.

## Trocar a identidade visual

A marca é provisória. Para rebrandar sem tocar em componente:

- `lib/brand.config.ts` — nome, tagline, WhatsApp, Instagram, e-mail.
- `app/globals.css` — os tokens em `:root` (cores, fontes). Não renomeie as
  variáveis; os componentes referenciam esses nomes.

## QA

O checklist de QA manual está em [`docs/QA.md`](docs/QA.md). A verificação do
banco após o lançamento é o `supabase/smoke.sql`.
