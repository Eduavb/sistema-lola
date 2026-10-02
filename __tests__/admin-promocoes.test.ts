import { describe, it, expect } from "vitest";
import {
  PROMOCAO_VAZIA,
  formatarPeriodo,
  promocaoParaForm,
  rotuloAplicaA,
  validarPromocao,
  type PromocaoForm,
} from "@/lib/admin-promocoes";

const base: PromocaoForm = { ...PROMOCAO_VAZIA, nome: "Black Friday", desconto: "20" };

describe("validarPromocao", () => {
  it("aceita o mínimo válido e devolve o payload normalizado", () => {
    const r = validarPromocao(base);
    expect(r.erros).toEqual({});
    expect(r.payload).toEqual({
      nome: "Black Friday",
      desconto: 20,
      categoria_id: null,
      inicio: null,
      fim: null,
      cupom: null,
      ativa: true,
    });
  });

  it("exige nome", () => {
    expect(validarPromocao({ ...base, nome: "   " }).erros.nome).toBeTruthy();
  });

  it("limita o nome a 120 caracteres", () => {
    expect(validarPromocao({ ...base, nome: "a".repeat(121) }).erros.nome).toBeTruthy();
  });

  it.each(["", "0", "91", "abc", "10.5", "-5"])("recusa desconto %j", (d) => {
    expect(validarPromocao({ ...base, desconto: d }).erros.desconto).toBeTruthy();
  });

  it.each(["1", "90", " 35 "])("aceita desconto %j", (d) => {
    expect(validarPromocao({ ...base, desconto: d }).erros.desconto).toBeUndefined();
  });

  it("fim anterior ao início é erro; igual ou posterior passa", () => {
    expect(validarPromocao({ ...base, inicio: "2026-11-10", fim: "2026-11-09" }).erros.fim).toBeTruthy();
    expect(validarPromocao({ ...base, inicio: "2026-11-10", fim: "2026-11-10" }).erros.fim).toBeUndefined();
    expect(validarPromocao({ ...base, inicio: "2026-11-10", fim: "2026-12-01" }).erros.fim).toBeUndefined();
  });

  it("datas parciais são aceitas", () => {
    expect(validarPromocao({ ...base, inicio: "2026-11-10" }).erros).toEqual({});
    expect(validarPromocao({ ...base, fim: "2026-11-10" }).erros).toEqual({});
  });

  it("recusa data malformada ou inexistente", () => {
    expect(validarPromocao({ ...base, inicio: "10/11/2026" }).erros.inicio).toBeTruthy();
    expect(validarPromocao({ ...base, fim: "2026-13-40" }).erros.fim).toBeTruthy();
    expect(validarPromocao({ ...base, fim: "2026-02-30" }).erros.fim).toBeTruthy();
  });

  it("cupom: maiúsculas, sem espaços, até 40 de A-Z 0-9 _ -", () => {
    expect(validarPromocao({ ...base, cupom: " lola10 " }).payload?.cupom).toBe("LOLA10");
    expect(validarPromocao({ ...base, cupom: "lola 10" }).erros.cupom).toBeTruthy();
    expect(validarPromocao({ ...base, cupom: "ç!" }).erros.cupom).toBeTruthy();
    expect(validarPromocao({ ...base, cupom: "A".repeat(41) }).erros.cupom).toBeTruthy();
    expect(validarPromocao({ ...base, cupom: "   " }).payload?.cupom).toBeNull();
  });

  it("aplica a categoria: escolher categoria sem id é erro", () => {
    expect(validarPromocao({ ...base, aplicaA: "categoria", categoriaId: "" }).erros.categoriaId).toBeTruthy();
    const r = validarPromocao({ ...base, aplicaA: "categoria", categoriaId: "c1" });
    expect(r.payload?.categoria_id).toBe("c1");
  });

  it("loja inteira ignora categoria escolhida antes", () => {
    expect(validarPromocao({ ...base, aplicaA: "loja", categoriaId: "c1" }).payload?.categoria_id).toBeNull();
  });

  it("payload é nulo quando há erro", () => {
    expect(validarPromocao({ ...base, nome: "" }).payload).toBeNull();
  });
});

describe("formatarPeriodo", () => {
  it("dd/mm → dd/mm", () => {
    expect(formatarPeriodo("2026-11-25", "2026-11-30")).toBe("25/11 → 30/11");
  });
  it("sem datas = Sem prazo", () => {
    expect(formatarPeriodo(null, null)).toBe("Sem prazo");
    expect(formatarPeriodo("", "")).toBe("Sem prazo");
  });
  it("só início ou só fim", () => {
    expect(formatarPeriodo("2026-11-25", null)).toBe("a partir de 25/11");
    expect(formatarPeriodo(null, "2026-11-30")).toBe("até 30/11");
  });
  it("ignora fuso: usa a data como veio", () => {
    expect(formatarPeriodo("2026-01-01", "2026-12-31")).toBe("01/01 → 31/12");
  });
});

describe("rotuloAplicaA", () => {
  it("toda a loja ou nome da categoria", () => {
    expect(rotuloAplicaA({ aplica_a_categoria_id: null, categoria_nome: null })).toBe("Toda a loja");
    expect(rotuloAplicaA({ aplica_a_categoria_id: "c1", categoria_nome: "Botas" })).toBe("Botas");
    expect(rotuloAplicaA({ aplica_a_categoria_id: "c1", categoria_nome: null })).toBe("Categoria removida");
  });
});

describe("promocaoParaForm", () => {
  it("converte registro do banco em formulário", () => {
    expect(
      promocaoParaForm({
        id: "p1",
        nome: "BF",
        desconto_percentual: 15,
        aplica_a_categoria_id: "c1",
        categoria_nome: "Botas",
        inicio: "2026-11-01",
        fim: null,
        cupom: "BF15",
        ativa: false,
        created_at: "2026-10-01T00:00:00Z",
      })
    ).toEqual({
      nome: "BF",
      desconto: "15",
      aplicaA: "categoria",
      categoriaId: "c1",
      inicio: "2026-11-01",
      fim: "",
      cupom: "BF15",
      ativa: false,
    });
  });
});
