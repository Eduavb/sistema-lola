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
  it("vazio vai para o WhatsApp", () => {
    expect(destinoAjuda("", WA)).toEqual({ href: WA, externo: true });
    expect(destinoAjuda("  ", WA)).toEqual({ href: WA, externo: true });
    expect(destinoAjuda(undefined, WA)).toEqual({ href: WA, externo: true });
  });
  it("http(s) é externo", () => {
    expect(destinoAjuda("https://x.com/a", WA)).toEqual({ href: "https://x.com/a", externo: true });
  });
  it("caminho interno não é externo", () => {
    expect(destinoAjuda("/minha-conta", WA)).toEqual({ href: "/minha-conta", externo: false });
  });
});

describe("primeiroNome", () => {
  it("pega a primeira palavra", () => {
    expect(primeiroNome("  Maria da Silva ")).toBe("Maria");
    expect(primeiroNome("")).toBe("");
  });
});
