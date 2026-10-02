import { describe, it, expect } from "vitest";
import {
  GRUPOS_TEXTOS,
  apenasAlteradas,
  chavesAlteradas,
  chavesDosGrupos,
  validarLinkTexto,
} from "@/lib/admin-textos";
import { TEXTOS_PADRAO } from "@/lib/textos";

describe("GRUPOS_TEXTOS", () => {
  it("cobre exatamente as chaves de TEXTOS_PADRAO, sem repetir", () => {
    const chaves = chavesDosGrupos();
    expect(new Set(chaves).size).toBe(chaves.length);
    expect([...chaves].sort()).toEqual(Object.keys(TEXTOS_PADRAO).sort());
    expect(chaves).toHaveLength(19);
  });

  it("os campos *_link são do tipo link", () => {
    for (const g of GRUPOS_TEXTOS)
      for (const c of g.campos) expect(c.tipo === "link").toBe(c.chave.endsWith("_link"));
  });
});

describe("alterações", () => {
  it("devolve só as chaves que mudaram", () => {
    const base = { ...TEXTOS_PADRAO };
    const atual = { ...base, "login.titulo": "Outro", "aviso.ativo": "false" };
    expect(chavesAlteradas(atual, base).sort()).toEqual(["aviso.ativo", "login.titulo"]);
    expect(apenasAlteradas(atual, base)).toEqual({ "aviso.ativo": "false", "login.titulo": "Outro" });
  });

  it("sem mudança, vazio", () => {
    expect(chavesAlteradas({ ...TEXTOS_PADRAO }, TEXTOS_PADRAO)).toEqual([]);
  });

  it("permite esvaziar um campo", () => {
    const atual = { ...TEXTOS_PADRAO, "rodape.descricao": "" };
    expect(apenasAlteradas(atual, TEXTOS_PADRAO)).toEqual({ "rodape.descricao": "" });
  });
});

describe("validarLinkTexto", () => {
  it("aceita vazio e os formatos permitidos", () => {
    for (const l of ["", "/trocas", "#ajuda", "https://x.com", "mailto:a@b.com", "tel:+5511999999999"])
      expect(validarLinkTexto(l)).toBeNull();
  });

  it("recusa o resto", () => {
    for (const l of ["javascript:alert(1)", "//x.com", "http://x.com", "trocas", "/a b", "/a\\b", "data:x"])
      expect(validarLinkTexto(l)).not.toBeNull();
  });
});
