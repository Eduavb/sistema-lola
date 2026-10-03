import { describe, it, expect } from "vitest";
import { TEXTOS_PADRAO, mesclarTextos } from "@/lib/textos";

describe("TEXTOS_PADRAO", () => {
  it("contém as chaves do seed", () => {
    expect(Object.keys(TEXTOS_PADRAO)).toHaveLength(19);
    expect(TEXTOS_PADRAO["home.categorias_etiqueta"]).toBe("");
    expect(TEXTOS_PADRAO["login.titulo"]).toBe("Pisa confiante.");
    expect(TEXTOS_PADRAO["aviso.ativo"]).toBe("true");
  });
});

describe("mesclarTextos", () => {
  it("valor do banco prevalece", () => {
    expect(mesclarTextos({ "login.titulo": "Outro" })["login.titulo"]).toBe("Outro");
  });

  it("chave ausente cai no padrão", () => {
    expect(mesclarTextos({})).toEqual(TEXTOS_PADRAO);
  });

  it("vazio ou whitespace cai no padrão", () => {
    const r = mesclarTextos({ "login.titulo": "", "login.etiqueta": "   \n" });
    expect(r["login.titulo"]).toBe(TEXTOS_PADRAO["login.titulo"]);
    expect(r["login.etiqueta"]).toBe(TEXTOS_PADRAO["login.etiqueta"]);
  });

  it("não-string cai no padrão", () => {
    const r = mesclarTextos({ "login.titulo": 42, "aviso.ativo": true, "aviso.texto": null });
    expect(r["login.titulo"]).toBe(TEXTOS_PADRAO["login.titulo"]);
    expect(r["aviso.ativo"]).toBe("true");
    expect(r["aviso.texto"]).toBe(TEXTOS_PADRAO["aviso.texto"]);
  });

  it("chaves extras são ignoradas", () => {
    expect(mesclarTextos({ "x.y": "z" })).not.toHaveProperty("x.y");
  });

  it("entrada null, undefined, array ou primitivo devolve o padrão", () => {
    for (const entrada of [null, undefined, [], ["login.titulo"], "texto", 5]) {
      expect(mesclarTextos(entrada)).toEqual(TEXTOS_PADRAO);
    }
  });

  it("não muta TEXTOS_PADRAO", () => {
    const r = mesclarTextos({ "login.titulo": "Outro" });
    r["login.etiqueta"] = "mudou";
    expect(TEXTOS_PADRAO["login.etiqueta"]).toBe("COLEÇÃO VERÃO 26");
  });
});
