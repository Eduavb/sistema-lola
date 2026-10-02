import { describe, it, expect } from "vitest";
import {
  LARGURA_MAX_CATEGORIA,
  LIMITE_IMAGEM_CATEGORIA,
  dimensoesCategoria,
  validarImagemCategoria,
  validarTipoImagemCategoria,
} from "@/lib/admin-categoria-imagem";

describe("validarImagemCategoria", () => {
  it("aceita nulo e indefinido (remover ou não enviar)", () => {
    expect(validarImagemCategoria(null)).toBeNull();
    expect(validarImagemCategoria(undefined)).toBeNull();
  });
  it("aceita jpeg, png e webp em base64", () => {
    for (const t of ["jpeg", "png", "webp"]) {
      expect(validarImagemCategoria(`data:image/${t};base64,AAAA`)).toBeNull();
    }
  });
  it("recusa outros tipos e formatos", () => {
    expect(validarImagemCategoria("data:image/gif;base64,AAAA")).toBeTruthy();
    expect(validarImagemCategoria("data:image/svg+xml;base64,AAAA")).toBeTruthy();
    expect(validarImagemCategoria("data:text/html;base64,AAAA")).toBeTruthy();
    expect(validarImagemCategoria("https://x.com/a.jpg")).toBeTruthy();
    expect(validarImagemCategoria("data:image/png,AAAA")).toBeTruthy();
    expect(validarImagemCategoria("data:image/png;base64,AA AA")).toBeTruthy();
    expect(validarImagemCategoria(123)).toBeTruthy();
  });
  it("limite de 1.500.000 caracteres", () => {
    expect(LIMITE_IMAGEM_CATEGORIA).toBe(1_500_000);
    const prefixo = "data:image/jpeg;base64,";
    const noLimite = prefixo + "A".repeat(LIMITE_IMAGEM_CATEGORIA - prefixo.length);
    expect(validarImagemCategoria(noLimite)).toBeNull();
    expect(validarImagemCategoria(noLimite + "A")).toMatch(/pesada|grande/i);
  });
});

describe("validarTipoImagemCategoria", () => {
  it("jpeg, png e webp", () => {
    expect(validarTipoImagemCategoria("image/jpeg")).toBeNull();
    expect(validarTipoImagemCategoria("image/png")).toBeNull();
    expect(validarTipoImagemCategoria("image/webp")).toBeNull();
    expect(validarTipoImagemCategoria("image/gif")).toBeTruthy();
  });
});

describe("dimensoesCategoria", () => {
  it("reduz para 800 de largura mantendo a proporção", () => {
    expect(LARGURA_MAX_CATEGORIA).toBe(800);
    expect(dimensoesCategoria(1600, 1200)).toEqual({ largura: 800, altura: 600 });
  });
  it("não amplia imagens menores", () => {
    expect(dimensoesCategoria(500, 300)).toEqual({ largura: 500, altura: 300 });
  });
});
