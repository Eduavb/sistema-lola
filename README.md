# Loja LOLA — Fase 1 (Varejo)

Ecommerce de calçados e acessórios. Fase 1 entrega a loja de **varejo**: vitrine,
página de produto, carrinho, checkout com Mercado Pago (Pix e cartão), página de
acompanhamento do pedido, consulta de pedidos por telefone em `/minha-conta`,
página `/surpresa` e um painel `/admin` completo (Produtos, Categorias, Pedidos,
Financeiro, Config). Login de cliente e área de atacado ficam para as Fases 2 e 3.

## Pré-lançamento (obrigatório)

Antes da loja receber tráfego real, conclua **todos** os itens abaixo — alguns
são ação do operador, não código:

- [ ] Definir o WhatsApp real em `lib/brand.config.ts` (`BRAND.whatsapp`, só
      dígitos com DDI 55) — hoje é placeholder e é o destino de TODOS os links
      de contato do site (rodapé, `/surpresa`, "frete a combinar" no checkout e
      na página do pedido).
- [ ] **Rotacionar os segredos** que passaram pelo histórico do git nos
      primeiros commits das migrations: no SQL Editor
      `select admin_set_secret('<senha-atual>', '<nova-senha-forte-12+>');`
      e gerar um novo `ADMIN_WEBHOOK_SECRET` — atualizar a env var na Vercel e
      rodar `set search_path = public, extensions; update admin_config set webhook_secret_hash = crypt('<novo-webhook-secret>', gen_salt('bf', 10)) where id = 1;`
- [ ] Registrar o webhook `https://<domínio>/api/webhook/mercadopago` no painel
      do Mercado Pago (evento `payment`).
- [ ] Configurar `NTFY_TOPIC` (string longa aleatória) na Vercel e assinar o
      tópico no app ntfy.
- [ ] Rodar as migrations atualizadas (as RPCs mudaram: `checkout_iniciar_pedido`,
      `mp_register_order_payment`, `admin_set_secret`, `_settle_order`,
      `admin_settle_order`) — re-colar `0002_functions.sql` inteiro no SQL
      Editor (é tudo `create or replace`).
- [ ] Passar o `docs/QA-fase1.md` num deploy de preview.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4
- Supabase (Postgres) via `@supabase/supabase-js` — catálogo por query direta
  (RLS libera `SELECT` anônimo), escrita e checkout por RPCs `SECURITY DEFINER`
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
   | `NEXT_PUBLIC_SITE_URL` | Opcional. URL pública do site (ex.: `https://loja-lola.vercel.app`). Só é usada como fallback quando os headers da request não trazem o host |

   A **senha do `/admin`** também é definida na migration `0003` e entregue à
   parte — não fica em variável de ambiente.

## Migrations

No **SQL Editor** do Supabase, rode os arquivos de `supabase/migrations/` uma vez
cada, **nesta ordem**:

1. `0001_schema.sql`
2. `0002_functions.sql`
3. `0003_seed.sql`

Antes de rodar o `0003`, substitua os placeholders `<ADMIN_PASSWORD>` e
`<ADMIN_WEBHOOK_SECRET>` por valores reais (uma senha forte e uma string aleatória
longa). Alternativamente, rode o `0003` como está e depois ajuste com um
`UPDATE admin_config SET ...` no SQL Editor. Guarde os dois valores: a senha é o
login do `/admin` e o secret é o `ADMIN_WEBHOOK_SECRET` do ambiente.

## Scripts

```bash
npm run dev      # desenvolvimento em http://localhost:3000
npm run build    # build de produção
npm test         # testes unitários (Vitest)
npm run lint     # ESLint (deve sair com 0 erros)
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

O checklist de QA manual da Fase 1 está em [`docs/QA-fase1.md`](docs/QA-fase1.md).
