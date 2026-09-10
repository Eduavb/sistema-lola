# Checklist de QA manual — Fase 1 (Varejo)

Transcrição do §16 "Checklist de QA manual por fase" do spec
(`docs/superpowers/specs/2026-09-09-loja-lola-design.md`), seção **Fase 1**.

## Como rodar

Estes itens rodam contra um **deploy de preview da Vercel** ligado ao **Supabase
real** e a um **`MP_ACCESS_TOKEN`**. Como o token é de **produção**, os itens de
pagamento (Pix / cartão) exigem um pagamento real de valor pequeno — não há
sandbox. Faça a bateria depois do deploy e registre o resultado de cada item no
PR. Qualquer falha vira correção antes do merge.

## Já coberto pelo build automatizado

Estes comportamentos são exercitados por `npm run build`, `npm test` e por
inspeção do código; ainda vale confirmar em produção, mas não são o foco da
passada manual:

- Render das telas de estado vazio (vitrine sem produto, `/surpresa` sem produto
  ativo, `/minha-conta` sem resultado).
- 404 em rota inexistente e em `/pedido/<id>` inválido.
- Resposta `{skipped}` do webhook para eventos que não são de pagamento.
- Regras de preço de varejo/atacado, chave de carrinho e totais (testes Vitest —
  `__tests__/`).

## Precisa da passada manual pós-deploy

- [ ] Login no /admin com a senha definida no seed / rotação.
- [ ] Cadastrar categoria, produto com 2 cores e numerações, imagens base64.
- [ ] Produto sem estoque some da vitrine, continua no admin.
- [ ] Checkout `retirada` sem endereço → preferência MP sem linha de taxa.
- [ ] Checkout `entrega` → linha "Taxa de entrega" com o valor de `admin_config`.
- [ ] Checkout `entrega_fora` → sem taxa no MP.
- [ ] Pagar com Pix (produção, valor pequeno) → volta para `/pedido/<id>?pagamento=sucesso`.
- [ ] Webhook marca `pago`, baixa estoque, cria linhas em `sales`, dispara ntfy.
- [ ] Reenvio do mesmo webhook não duplica baixa nem venda (idempotência).
- [ ] Pagamento recusado/pendente → volta para `/pedido/<id>` com status certo.
- [ ] `/minha-conta` acha pedidos por telefone.
- [ ] `/surpresa`: sem produto ativo → tela vazia; com produto → "Comprar agora" vai direto ao checkout.
- [ ] Trocar senha do admin; senha antiga deixa de funcionar.
