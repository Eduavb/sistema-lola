import { describe, expect, it } from "vitest";
import { destinoAjuda, itensMenuConta, linksCategorias, primeiroNome } from "@/lib/header-menu";

const WA = "https://wa.me/5581987307223";

describe("itensMenuConta", () => {
  it("cliente: Minha conta e Sair", () => {
    const r = itensMenuConta({ nome: "Ana", papel: "cliente" });
    expect(r.map((i) => i.rotulo)).toEqual(["Minha conta", "Sair"]);
    expect(r[1].tipo).toBe("sair");
  });
  it("equipe ganha Painel", () => {
    for (const papel of ["superadmin", "admin", "supervisor"] as const) {
      const r = itensMenuConta({ nome: "X", papel });
      expect(r).toContainEqual({ tipo: "link", rotulo: "Painel", href: "/admin" });
      expect(r.map((i) => i.rotulo)).not.toContain("Painel de atacado");
    }
  });
  it("revendedor ganha Painel de atacado", () => {
    const r = itensMenuConta({ nome: "R", papel: "revendedor" });
    expect(r).toContainEqual({ tipo: "link", rotulo: "Painel de atacado", href: "/atacado" });
    expect(r.map((i) => i.rotulo)).not.toContain("Painel");
  });
});

describe("linksCategorias", () => {
  it("categorias reais seguidas de Lançamentos", () => {
    expect(linksCategorias([{ slug: "tenis", nome: "Tênis" }])).toEqual([
      { href: "/#cat-tenis", rotulo: "Tênis" },
      { href: "/#lancamentos", rotulo: "Lançamentos" },
    ]);
  });
  it("sem categorias mantém só Lançamentos", () => {
    expect(linksCategorias([])).toEqual([{ href: "/#lancamentos", rotulo: "Lançamentos" }]);
  });
});

describe("destinoAjuda", () => {
  const ZAP = { href: WA, tipo: "nova-aba" };
  it("vazio ou nulo vai para o WhatsApp", () => {
    expect(destinoAjuda("", WA)).toEqual(ZAP);
    expect(destinoAjuda("  ", WA)).toEqual(ZAP);
    expect(destinoAjuda(undefined, WA)).toEqual(ZAP);
    expect(destinoAjuda(null, WA)).toEqual(ZAP);
  });
  it("esquemas perigosos e formatos suspeitos caem no WhatsApp", () => {
    for (const v of [
      "javascript:alert(1)",
      "JAVASCRIPT:alert(1)",
      "data:text/html,<b>x</b>",
      "//evil.com",
      "/\\evil",
      " https://x",
      "https://x.com/a b",
      "/ok\nx",
      "ftp://x.com",
    ]) {
      expect(destinoAjuda(v, WA)).toEqual(ZAP);
    }
  });
  it("http(s) abre em nova aba", () => {
    expect(destinoAjuda("https://x.com", WA)).toEqual({ href: "https://x.com", tipo: "nova-aba" });
  });
  it("mailto e tel são links simples", () => {
    expect(destinoAjuda("mailto:a@b.co", WA)).toEqual({ href: "mailto:a@b.co", tipo: "simples" });
    expect(destinoAjuda("tel:+5511999999999", WA)).toEqual({
      href: "tel:+5511999999999",
      tipo: "simples",
    });
  });
  it("caminho interno e âncora", () => {
    expect(destinoAjuda("/ok", WA)).toEqual({ href: "/ok", tipo: "interno" });
    expect(destinoAjuda("#ancora", WA)).toEqual({ href: "#ancora", tipo: "simples" });
  });
});

describe("primeiroNome", () => {
  it("pega a primeira palavra", () => {
    expect(primeiroNome("  Maria da Silva ")).toBe("Maria");
    expect(primeiroNome("")).toBe("");
  });
});
