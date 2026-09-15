import { describe, it, expect } from "vitest";
import { corDaCategoria } from "@/lib/brand.config";

describe("corDaCategoria", () => {
  it("sandália (calçados) → mint", () => {
    expect(
      corDaCategoria({ grupo: "calcados", nome: "Sandália" })
    ).toEqual({ base: "var(--mint)", deep: "var(--mint-deep)" });
  });

  it("sapatilha (calçados) → lilac", () => {
    expect(
      corDaCategoria({ grupo: "calcados", nome: "Sapatilha" })
    ).toEqual({ base: "var(--lilac)", deep: "var(--lilac-deep)" });
  });

  it("tênis e outros calçados → pink", () => {
    expect(
      corDaCategoria({ grupo: "calcados", nome: "Tênis" })
    ).toEqual({ base: "var(--pink)", deep: "var(--pink-deep)" });
    expect(
      corDaCategoria({ grupo: "calcados", nome: "Bota" })
    ).toEqual({ base: "var(--pink)", deep: "var(--pink-deep)" });
  });

  it("acessórios (bolsas) → peach", () => {
    expect(
      corDaCategoria({ grupo: "acessorios", nome: "Bolsas" })
    ).toEqual({ base: "var(--peach)", deep: "var(--peach-deep)" });
  });

  it("categoria ausente → peach (fallback)", () => {
    expect(corDaCategoria(null)).toEqual({
      base: "var(--peach)",
      deep: "var(--peach-deep)",
    });
    expect(corDaCategoria(undefined)).toEqual({
      base: "var(--peach)",
      deep: "var(--peach-deep)",
    });
  });

  it("é case-insensitive no nome da categoria", () => {
    expect(
      corDaCategoria({ grupo: "calcados", nome: "SANDÁLIA rasteira" })
    ).toEqual({ base: "var(--mint)", deep: "var(--mint-deep)" });
  });
});
