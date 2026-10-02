import { describe, it, expect } from "vitest";
import {
  PAPEIS,
  EQUIPE,
  podeAcessar,
  telasVisiveis,
  ehEquipe,
  podeAprovarRevendedor,
  podeEditarRevendedor,
  podeGerirPapel,
  destinoPosLogin,
  type Papel,
  type Tela,
} from "@/lib/roles";

const TODAS: Tela[] = [
  "visao-geral",
  "pedidos",
  "financeiro",
  "produtos",
  "promocoes",
  "banner",
  "textos",
  "revendedores",
  "usuarios",
  "config",
];

const MATRIZ: Record<Papel, Tela[]> = {
  superadmin: TODAS,
  admin: TODAS.filter((t) => t !== "config"),
  supervisor: ["visao-geral", "pedidos", "revendedores"],
  revendedor: [],
  cliente: [],
};

describe("papéis", () => {
  it("lista os cinco papéis e a equipe", () => {
    expect(PAPEIS).toEqual(["superadmin", "admin", "supervisor", "revendedor", "cliente"]);
    expect(EQUIPE).toEqual(["superadmin", "admin", "supervisor"]);
  });

  it("ehEquipe", () => {
    expect(PAPEIS.filter(ehEquipe)).toEqual(EQUIPE);
  });
});

describe("podeAcessar e telasVisiveis", () => {
  for (const papel of PAPEIS) {
    for (const tela of TODAS) {
      const esperado = MATRIZ[papel].includes(tela);
      it(`${papel} ${esperado ? "acessa" : "não acessa"} ${tela}`, () => {
        expect(podeAcessar(papel, tela)).toBe(esperado);
      });
    }
    it(`telasVisiveis(${papel}) segue a ordem do menu`, () => {
      expect(telasVisiveis(papel)).toEqual(MATRIZ[papel]);
    });
  }
});

describe("aprovação e edição de revendedores", () => {
  it("aprovar: superadmin e admin", () => {
    expect(PAPEIS.filter(podeAprovarRevendedor)).toEqual(["superadmin", "admin"]);
  });
  it("editar: equipe inteira", () => {
    expect(PAPEIS.filter(podeEditarRevendedor)).toEqual(["superadmin", "admin", "supervisor"]);
  });
});

describe("podeGerirPapel", () => {
  for (const ator of PAPEIS) {
    for (const alvo of PAPEIS) {
      const esperado =
        ator === "superadmin" || (ator === "admin" && alvo !== "superadmin");
      it(`${ator} ${esperado ? "gere" : "não gere"} ${alvo}`, () => {
        expect(podeGerirPapel(ator, alvo)).toBe(esperado);
      });
    }
  }
});

describe("destinoPosLogin", () => {
  it("equipe vai para /admin ignorando next", () => {
    for (const p of EQUIPE) expect(destinoPosLogin(p, "/carrinho")).toBe("/admin");
  });
  it("revendedor vai para /atacado", () => {
    expect(destinoPosLogin("revendedor", "/carrinho")).toBe("/atacado");
  });
  it("cliente volta para next seguro", () => {
    expect(destinoPosLogin("cliente", "/carrinho")).toBe("/carrinho");
  });
  it("cliente sem next vai para /", () => {
    expect(destinoPosLogin("cliente")).toBe("/");
    expect(destinoPosLogin("cliente", null)).toBe("/");
  });
  it.each(["//evil.com", "https://x", "/\\evil", "javascript:alert(1)", "carrinho", ""])(
    "cliente com next malicioso %j vai para /",
    (next) => {
      expect(destinoPosLogin("cliente", next)).toBe("/");
    }
  );
});
