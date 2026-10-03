import { describe, it, expect } from "vitest";
import { contarAtivas, estadoPromocao, notaDaPromocao } from "@/lib/admin-promocoes";

const promo = (over: { cupom?: string | null; ativa?: boolean }) => ({ cupom: null, ativa: true, ...over });

describe("estado da promoção com cupom", () => {
  it("ativa sem cupom é Ativa; com cupom é Guardada (cupom); desligada é Inativa", () => {
    expect(estadoPromocao(promo({}))).toBe("Ativa");
    expect(estadoPromocao(promo({ cupom: "BF10" }))).toBe("Guardada (cupom)");
    expect(estadoPromocao(promo({ ativa: false }))).toBe("Inativa");
    expect(estadoPromocao(promo({ ativa: false, cupom: "BF10" }))).toBe("Inativa");
  });
  it("contagem de ativas ignora promoções com cupom", () => {
    expect(contarAtivas([promo({}), promo({ cupom: "X" }), promo({ ativa: false })])).toBe(1);
  });
  it("nota muda quando há cupom", () => {
    expect(notaDaPromocao("")).toBe("Cupom ainda não é aplicado no checkout.");
    expect(notaDaPromocao(" lola10 ")).toBe(
      "Promoção com cupom fica guardada e não altera nenhum preço até o checkout aceitar cupom."
    );
  });
});
