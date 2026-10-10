import { describe, expect, it } from "vitest";
import { dadosPublicosHeader, destinoAjuda, itensMenuConta, linksCategorias, primeiroNome } from "@/lib/header-menu";

const WA = "https://wa.me/5581987307223";

describe("itensMenuConta", () => {
  it("cliente: Minha conta e Sair", () => {
    const r = itensMenuConta({ nome: "Ana", papel: "cliente" });
    expect(r.map((i) => i.rotulo)).toEqual(["Minha conta", "Sair"]);
    expect(r[1].tipo).toBe("sair");
  });
  it("equipe vê só Painel e Sair", () => {
    for (const papel of ["superadmin", "admin", "supervisor"] as const) {
      const r = itensMenuConta({ nome: "X", papel });
      expect(r.map((i) => i.rotulo)).toEqual(["Painel", "Sair"]);
      expect(r[0]).toEqual({ tipo: "link", rotulo: "Painel", href: "/admin" });
    }
  });
  it("revendedor vê só Painel de atacado e Sair", () => {
    const r = itensMenuConta({ nome: "R", papel: "revendedor" });
    expect(r.map((i) => i.rotulo)).toEqual(["Painel de atacado", "Sair"]);
    expect(r[0]).toEqual({ tipo: "link", rotulo: "Painel de atacado", href: "/atacado" });
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

describe("dadosPublicosHeader", () => {
  it("remove o perfil e mantém só dados públicos", () => {
    const r = dadosPublicosHeader({
      categorias: [{ slug: "a", nome: "A" }],
      perfil: { nome: "Ana", papel: "admin" },
      avisoTexto: "oi",
      avisoAtivo: "true",
    });
    expect(r).toEqual({ categorias: [{ slug: "a", nome: "A" }], avisoTexto: "oi", avisoAtivo: "true" });
    expect("perfil" in r).toBe(false);
    expect(JSON.stringify(r)).not.toContain("Ana");
  });
});

describe("primeiroNome", () => {
  it("pega a primeira palavra", () => {
    expect(primeiroNome("  Maria da Silva ")).toBe("Maria");
    expect(primeiroNome("")).toBe("");
  });
});
