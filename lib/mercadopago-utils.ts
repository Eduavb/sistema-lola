// Helpers puros do cliente Mercado Pago. Sem `import "server-only"` de
// propósito: são funções sem I/O nem segredos, testáveis em ambiente node
// (Vitest) e reexportadas por `lib/mercadopago.ts`.

/**
 * Monta as três back_urls do Checkout Pro a partir da origin e do caminho de
 * retorno. Cada URL leva ao mesmo caminho, variando só o query `?pagamento=`.
 */
export type ItemPreferencia = {
  titulo: string;
  quantidade: number;
  precoUnitario: number;
};

/**
 * Monta as linhas da preferência Mercado Pago a partir das linhas já
 * precificadas pela RPC `checkout_iniciar_pedido` (`itens[]` do retorno) —
 * a fonte da verdade do valor cobrado. O preço vindo do cliente
 * (`localStorage`) nunca entra aqui. Quando `entregaTaxa > 0`, acrescenta a
 * linha "Taxa de entrega"; caso contrário ela é omitida.
 */
export function montarItensMP(
  rpcItens: { titulo: string; quantidade: number; preco_unit: number }[],
  entregaTaxa: number
): ItemPreferencia[] {
  const itens: ItemPreferencia[] = rpcItens.map((i) => ({
    titulo: i.titulo,
    quantidade: i.quantidade,
    precoUnitario: Number(i.preco_unit),
  }));
  if (entregaTaxa > 0) {
    itens.push({ titulo: "Taxa de entrega", quantidade: 1, precoUnitario: entregaTaxa });
  }
  return itens;
}

export function montarBackUrls(origin: string, successPath: string) {
  return {
    success: `${origin}${successPath}?pagamento=sucesso`,
    failure: `${origin}${successPath}?pagamento=falha`,
    pending: `${origin}${successPath}?pagamento=pendente`,
  };
}

/**
 * Traduz o método/tipo de pagamento do Mercado Pago para um rótulo curto em
 * português para exibir no pedido.
 */
export function mapFormaPagamento(
  paymentMethodId: string | null,
  paymentTypeId: string | null
): string {
  if (paymentMethodId === "pix") return "Pix";
  if (paymentTypeId === "credit_card") return "Cartão de crédito";
  return paymentTypeId ?? "Mercado Pago";
}
