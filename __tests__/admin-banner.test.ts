import { describe, it, expect } from "vitest";
import {
  BANNER_VAZIO,
  LIMITE_DATA_URI,
  LARGURA_MAX_IMAGEM,
  dimensoesAlvo,
  montarRascunho,
  normalizarBanner,
  normalizarServidor,
  temAlteracoes,
  validarBanner,
  validarDataUri,
  validarLinkBotao,
  validarTipoImagem,
} from "@/lib/admin-banner";

describe("validarLinkBotao", () => {
  it("aceita vazio, /caminho, #ancora e https://", () => {
    for (const l of ["", "   ", "/lancamentos", "#lancamentos", "https://lola.com/x"]) {
      expect(validarLinkBotao(l)).toBeNull();
    }
  });

  it("recusa protocolos e formas perigosas", () => {
    for (const l of ["http://x.com", "javascript:alert(1)", "//evil.com", "lancamentos", "mailto:a@b.c", "/a b", "/a\\b", "data:text/html,x"]) {
      expect(validarLinkBotao(l)).not.toBeNull();
    }
  });
});

describe("validarTipoImagem / validarDataUri", () => {
  it("aceita só jpeg, png e webp", () => {
    expect(validarTipoImagem("image/jpeg")).toBeNull();
    expect(validarTipoImagem("image/png")).toBeNull();
    expect(validarTipoImagem("image/webp")).toBeNull();
    expect(validarTipoImagem("image/gif")).not.toBeNull();
    expect(validarTipoImagem("image/svg+xml")).not.toBeNull();
    expect(validarTipoImagem("")).not.toBeNull();
  });

  it("recusa data URI acima de 3.000.000 caracteres", () => {
    expect(validarDataUri("data:image/jpeg;base64," + "A".repeat(100))).toBeNull();
    expect(validarDataUri("x".repeat(LIMITE_DATA_URI))).toBeNull();
    expect(validarDataUri("x".repeat(LIMITE_DATA_URI + 1))).toMatch(/muito pesada/);
  });
});

describe("dimensoesAlvo", () => {
  it("mantém imagens estreitas", () => {
    expect(dimensoesAlvo(800, 600)).toEqual({ largura: 800, altura: 600 });
  });

  it("reduz para a largura máxima mantendo a proporção", () => {
    expect(LARGURA_MAX_IMAGEM).toBe(1600);
    expect(dimensoesAlvo(3200, 1800)).toEqual({ largura: 1600, altura: 900 });
    expect(dimensoesAlvo(4000, 3001)).toEqual({ largura: 1600, altura: 1200 });
  });

  it("nunca devolve altura zero", () => {
    expect(dimensoesAlvo(32000, 1).altura).toBe(1);
  });
});

describe("normalizarBanner", () => {
  it("devolve o vazio para entrada inválida", () => {
    expect(normalizarBanner(null)).toEqual(BANNER_VAZIO);
    expect(normalizarBanner([])).toEqual(BANNER_VAZIO);
    expect(normalizarBanner("x")).toEqual(BANNER_VAZIO);
  });

  it("lê os campos conhecidos e ignora tipos errados", () => {
    const b = normalizarBanner({
      etiqueta: "E",
      titulo: 5,
      cta2_mostrar: false,
      imagem: "data:image/jpeg;base64,AAAA",
      lixo: "x",
    });
    expect(b.etiqueta).toBe("E");
    expect(b.titulo).toBe("");
    expect(b.cta2_mostrar).toBe(false);
    expect(b.imagem).toBe("data:image/jpeg;base64,AAAA");
    expect(Object.keys(b).sort()).toEqual(Object.keys(BANNER_VAZIO).sort());
  });

  it("cta2_mostrar ausente vale verdadeiro", () => {
    expect(normalizarBanner({}).cta2_mostrar).toBe(true);
  });
});

describe("normalizarServidor", () => {
  it("recusa resposta sem publicado", () => {
    expect(normalizarServidor(null)).toBeNull();
    expect(normalizarServidor({ rascunho: null })).toBeNull();
  });

  it("mescla o rascunho sobre o publicado", () => {
    const s = normalizarServidor({
      publicado: { titulo: "A", etiqueta: "E" },
      rascunho: { titulo: "B" },
      publicado_em: "2026-10-02T10:00:00Z",
    });
    expect(s?.publicado.titulo).toBe("A");
    expect(s?.rascunho?.titulo).toBe("B");
    expect(s?.rascunho?.etiqueta).toBe("E");
    expect(s?.publicadoEm).toBe("2026-10-02T10:00:00Z");
  });

  it("sem rascunho devolve nulo", () => {
    expect(normalizarServidor({ publicado: { titulo: "A" }, rascunho: null })?.rascunho).toBeNull();
  });
});

describe("temAlteracoes", () => {
  const base = { ...BANNER_VAZIO, titulo: "Pisa confiante." };

  it("falso para iguais", () => {
    expect(temAlteracoes({ ...base }, base)).toBe(false);
  });

  it("verdadeiro ao mudar qualquer campo", () => {
    expect(temAlteracoes({ ...base, titulo: "Outro" }, base)).toBe(true);
    expect(temAlteracoes({ ...base, cta2_mostrar: !base.cta2_mostrar }, base)).toBe(true);
    expect(temAlteracoes({ ...base, imagem: "data:image/jpeg;base64,AA" }, base)).toBe(true);
  });

  it("ignora espaços nas pontas", () => {
    expect(temAlteracoes({ ...base, titulo: "Pisa confiante.  " }, base)).toBe(false);
  });
});

describe("validarBanner", () => {
  it("exige título e link válido", () => {
    expect(validarBanner({ ...BANNER_VAZIO, titulo: "" }).titulo).toBeTruthy();
    expect(validarBanner({ ...BANNER_VAZIO, titulo: "x", cta1_link: "ftp://a" }).cta1_link).toBeTruthy();
    expect(validarBanner({ ...BANNER_VAZIO, titulo: "x", cta1_link: "/ok" })).toEqual({});
  });
});

describe("montarRascunho", () => {
  it("manda todos os campos com texto aparado", () => {
    const r = montarRascunho({
      ...BANNER_VAZIO,
      etiqueta: " A ",
      titulo: " T ",
      cta1_link: " /x ",
      imagem: null,
    });
    expect(r.etiqueta).toBe("A");
    expect(r.titulo).toBe("T");
    expect(r.cta1_link).toBe("/x");
    expect(r.imagem).toBeNull();
    expect(Object.keys(r).sort()).toEqual(Object.keys(BANNER_VAZIO).sort());
  });
});
