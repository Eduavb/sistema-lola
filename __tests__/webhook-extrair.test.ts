import { describe, it, expect } from "vitest";
import { parsePaymentId } from "@/lib/mp-webhook";

describe("parsePaymentId", () => {
  it("lê data.id da query", () => {
    expect(parsePaymentId(new URL("https://x/y?data.id=123&type=payment"), null)).toBe("123");
  });
  it("lê id da query quando não há topic", () => {
    expect(parsePaymentId(new URL("https://x/y?id=456"), null)).toBe("456");
  });
  it("lê do body JSON tipo payment", () => {
    expect(parsePaymentId(new URL("https://x/y"), { type: "payment", data: { id: 789 } })).toBe("789");
  });
  it("retorna null sem pistas", () => {
    expect(parsePaymentId(new URL("https://x/y"), null)).toBeNull();
  });
});
