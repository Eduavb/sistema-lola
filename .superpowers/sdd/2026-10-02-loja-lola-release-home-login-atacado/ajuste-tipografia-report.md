# Ajuste de tipografia e estado vazio

Branch: loja-lola-ajuste-tipografia (a partir de origin/main), apenas commits locais.

- Títulos de página (carrinho, minha-conta, checkout varejo/atacado, pedido, surpresa, produto, SurpresaOffer): Hanken Grotesk 700, clamp(28px,4vw,40px), letter-spacing -.01em, sem itálico.
- Wordmarks em /surpresa e SurpresaOffer: Hanken Grotesk 600, tamanho e espaçamento mantidos.
- Admin (ConfigTab, PedidosTab, SalesTab): 20px/600, sem itálico, fonte herdada.
- globals.css: removidos `--font-serif` e a classe `.serif` (sem uso); `.split-media .cap h3`, `.split-media.placeholder .ph-inner h3` e `.tile .label h3` (classes sem uso nos TSX) passaram a sans 600, sem itálico.
- layout.tsx: removido Fraunces do link de fontes.
- GrupoSection: estado vazio agora "Novidades chegando em breve." sem link para /admin; prop `emptyLabel` removida (app/page.tsx ajustado).
- Grep final: nenhum `font-serif`, `Fraunces`, `italic` ou "Cadastre no" em app/components/lib.

Arquivos: app/carrinho/page.tsx, app/checkout/CheckoutAtacado.tsx, app/checkout/CheckoutVarejo.tsx, app/globals.css, app/layout.tsx, app/minha-conta/page.tsx, app/pedido/[id]/page.tsx, app/surpresa/page.tsx, app/page.tsx, components/ProductDetail.tsx, components/SurpresaOffer.tsx, components/admin/ConfigTab.tsx, components/admin/PedidosTab.tsx, components/admin/SalesTab.tsx, components/home/GrupoSection.tsx.

Verificação: npm test 526/526 (25 arquivos), npm run lint limpo, npm run build ok.
