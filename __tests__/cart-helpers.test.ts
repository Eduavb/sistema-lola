import { describe, it, expect } from "vitest";
import { makeCartKey, calcTotais } from "@/lib/cart";

describe("makeCartKey", () => {
  it("compõe produto+cor+tamanho e trata size nulo", () => {
    expect(makeCartKey("p", "c", "36")).toBe("p::c::36");
    expect(makeCartKey("p", "c", null)).toBe("p::c::");
  });
});

describe("calcTotais", () => {
  it("soma quantidade e valor", () => {
    const r = calcTotais([
      { quantidade: 2, precoUnit: 50 } as any,
      { quantidade: 1, precoUnit: 30 } as any,
    ]);
    expect(r.totalItens).toBe(3);
    expect(r.totalValor).toBe(130);
  });
});
