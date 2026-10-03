import { describe, it, expect } from "vitest";
import { mapFormaPagamento, montarBackUrls, resolverOrigem } from "@/lib/mercadopago-utils";

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

describe("resolverOrigem", () => {
  it("prefere NEXT_PUBLIC_SITE_URL, sem barra final", () => {
    expect(resolverOrigem("https://lola.com.br/", "evil.com", "https")).toBe("https://lola.com.br");
  });
  it("sem a variável, usa o host da requisição", () => {
    expect(resolverOrigem(undefined, "localhost:3000", "http")).toBe("http://localhost:3000");
    expect(resolverOrigem("", "lola.vercel.app", null)).toBe("https://lola.vercel.app");
  });
  it("variável malformada ou não http(s) cai no host da requisição", () => {
    expect(resolverOrigem("javascript:alert(1)", "lola.vercel.app", "https")).toBe("https://lola.vercel.app");
    expect(resolverOrigem("lola.com.br", "lola.vercel.app", "https")).toBe("https://lola.vercel.app");
  });
  it("ignora caminho e query da variável", () => {
    expect(resolverOrigem("https://lola.com.br/loja?x=1", null, null)).toBe("https://lola.com.br");
  });
  it("sem nada utilizável devolve string vazia", () => {
    expect(resolverOrigem(undefined, null, null)).toBe("");
  });
  it("host da requisição inválido é descartado", () => {
    expect(resolverOrigem(undefined, "a b/c", "https")).toBe("");
  });
});
