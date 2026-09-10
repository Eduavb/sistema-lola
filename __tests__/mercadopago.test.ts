import { describe, it, expect } from "vitest";
import { mapFormaPagamento, montarBackUrls } from "@/lib/mercadopago-utils";

describe("mapFormaPagamento", () => {
  it("pix", () => expect(mapFormaPagamento("pix", "bank_transfer")).toBe("Pix"));
  it("cartão de crédito", () =>
    expect(mapFormaPagamento("visa", "credit_card")).toBe("Cartão de crédito"));
  it("fallback usa o payment_type_id", () =>
    expect(mapFormaPagamento(null, "account_money")).toBe("account_money"));
  it("fallback final", () => expect(mapFormaPagamento(null, null)).toBe("Mercado Pago"));
});

describe("montarBackUrls", () => {
  it("aponta os três resultados para /pedido/<id>", () => {
    const u = montarBackUrls("https://lola.com", "/pedido/abc");
    expect(u.success).toBe("https://lola.com/pedido/abc?pagamento=sucesso");
    expect(u.failure).toBe("https://lola.com/pedido/abc?pagamento=falha");
    expect(u.pending).toBe("https://lola.com/pedido/abc?pagamento=pendente");
  });
});
