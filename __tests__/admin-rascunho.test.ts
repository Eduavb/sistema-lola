import { describe, it, expect } from "vitest";
import { temAlteracoes } from "@/lib/admin-rascunho";
import { textosValidos, traduzirErroCategoria } from "@/lib/admin-erros";

describe("temAlteracoes", () => {
  it("igual = sem alterações", () => {
    expect(temAlteracoes({ a: "x", b: true }, { a: "x", b: true })).toBe(false);
  });
  it("qualquer campo diferente = alterado", () => {
    expect(temAlteracoes({ a: "x" }, { a: "y" })).toBe(true);
    expect(temAlteracoes({ a: "x", b: [1] }, { a: "x", b: [1, 2] })).toBe(true);
  });
});

describe("traduzirErroCategoria", () => {
  it("slug duplicado, categoria com produtos e genérico", () => {
    expect(
      traduzirErroCategoria('duplicate key value violates unique constraint "categorias_slug_key"')
    ).toBe("Já existe uma categoria com esse nome/slug.");
    expect(traduzirErroCategoria("categoria possui produtos")).toMatch(/tem produtos/);
    expect(traduzirErroCategoria("relation x boom")).not.toMatch(/relation/);
    expect(traduzirErroCategoria("sem permissão")).toBe("Sem permissão.");
  });
});

describe("textosValidos", () => {
  it("exige string nas chaves informadas", () => {
    expect(textosValidos({ a: "x", b: "" }, ["a", "b"])).toBe(true);
    expect(textosValidos({ a: 1 }, ["a"])).toBe(false);
    expect(textosValidos({}, ["a"])).toBe(false);
    expect(textosValidos(null, ["a"])).toBe(false);
  });
});
