import { describe, it, expect } from "vitest";
import {
  FILTROS_PAPEL,
  chipPapel,
  filtrarUsuarios,
  inicialDoUsuario,
  motivoSemEdicao,
  opcoesDePapel,
  rotuloStatus,
  rotuloUltimoAcesso,
  traduzirErroUsuarios,
  validarConvite,
  type Usuario,
} from "@/lib/admin-usuarios";
import { PAPEIS } from "@/lib/roles";

const u = (over: Partial<Usuario>): Usuario => ({
  id: "u1",
  email: "ana@exemplo.com",
  nome: "Ana",
  papel: "cliente",
  ativo: true,
  ultimo_acesso: null,
  created_at: "2026-01-01T00:00:00Z",
  ...over,
});

describe("filtrarUsuarios", () => {
  const lista = [u({ id: "1", papel: "admin" }), u({ id: "2", papel: "cliente" }), u({ id: "3", papel: "cliente" })];
  it("todos devolve tudo", () => {
    expect(filtrarUsuarios(lista, "todos")).toHaveLength(3);
  });
  it("filtra por papel", () => {
    expect(filtrarUsuarios(lista, "cliente").map((x) => x.id)).toEqual(["2", "3"]);
    expect(filtrarUsuarios(lista, "supervisor")).toEqual([]);
  });
  it("os filtros são Todos + cada papel, em PT-BR", () => {
    expect(FILTROS_PAPEL.map((f) => f.rotulo)).toEqual([
      "Todos",
      "Superadmin",
      "Admin",
      "Supervisor",
      "Revendedor",
      "Cliente",
    ]);
  });
});

describe("rótulos", () => {
  it("último acesso em pt-BR ou Nunca", () => {
    expect(rotuloUltimoAcesso(null)).toBe("Nunca");
    expect(rotuloUltimoAcesso("lixo")).toBe("Nunca");
    expect(rotuloUltimoAcesso("2026-03-04T15:30:00Z")).toMatch(/^0[34]\/03\/2026/);
  });
  it("status", () => {
    expect(rotuloStatus(true)).toBe("Ativo");
    expect(rotuloStatus(false)).toBe("Inativo");
  });
  it("inicial do avatar usa nome, senão e-mail", () => {
    expect(inicialDoUsuario(u({ nome: "bia" }))).toBe("B");
    expect(inicialDoUsuario(u({ nome: "  ", email: "ze@x.com" }))).toBe("Z");
  });
  it("chip por papel", () => {
    expect(chipPapel("superadmin").bg).toBe(chipPapel("admin").bg);
    expect(chipPapel("supervisor").bg).not.toBe(chipPapel("cliente").bg);
    for (const p of PAPEIS) expect(chipPapel(p).texto).toBeTruthy();
  });
});

describe("opcoesDePapel", () => {
  it("superadmin oferece todos os papéis", () => {
    expect(opcoesDePapel("superadmin")).toEqual(PAPEIS);
  });
  it("admin nunca vê superadmin", () => {
    expect(opcoesDePapel("admin")).toEqual(["admin", "supervisor", "revendedor", "cliente"]);
  });
  it("supervisor e demais não gerenciam ninguém", () => {
    expect(opcoesDePapel("supervisor")).toEqual([]);
    expect(opcoesDePapel("cliente")).toEqual([]);
  });
});

describe("motivoSemEdicao", () => {
  it("ninguém edita a si mesmo", () => {
    expect(motivoSemEdicao("superadmin", u({ id: "eu" }), "eu")).toMatch(/própri/);
  });
  it("admin não edita superadmin", () => {
    expect(motivoSemEdicao("admin", u({ papel: "superadmin" }), "eu")).toMatch(/superadmin/i);
  });
  it("superadmin edita admin e admin edita supervisor", () => {
    expect(motivoSemEdicao("superadmin", u({ papel: "admin" }), "eu")).toBeNull();
    expect(motivoSemEdicao("admin", u({ papel: "supervisor" }), "eu")).toBeNull();
  });
});

describe("validarConvite", () => {
  it("e-mail válido e papel permitido, normalizando o e-mail", () => {
    expect(validarConvite("admin", "  Ana@Exemplo.com ", "supervisor")).toEqual({
      erros: {},
      email: "ana@exemplo.com",
    });
  });
  it("e-mail inválido", () => {
    expect(validarConvite("admin", "ana", "cliente").erros.email).toBeTruthy();
    expect(validarConvite("admin", "", "cliente").erros.email).toBeTruthy();
  });
  it("admin não convida superadmin", () => {
    expect(validarConvite("admin", "a@b.com", "superadmin").erros.papel).toBeTruthy();
    expect(validarConvite("superadmin", "a@b.com", "superadmin").erros.papel).toBeUndefined();
  });
});

describe("traduzirErroUsuarios", () => {
  it("mapeia mensagens conhecidas", () => {
    expect(traduzirErroUsuarios("não é possível alterar o próprio usuário")).toMatch(/próprio/);
    expect(traduzirErroUsuarios("é preciso manter ao menos um superadmin ativo")).toMatch(/superadmin/);
    expect(traduzirErroUsuarios("e-mail do usuário ainda não confirmado")).toMatch(/confirm/);
    expect(traduzirErroUsuarios("convite não encontrado")).toMatch(/convite/i);
    expect(traduzirErroUsuarios("sem permissão")).toBe("Sem permissão.");
  });
  it("não vaza detalhe desconhecido do banco", () => {
    const msg = traduzirErroUsuarios('duplicate key value violates constraint "profiles_pkey"');
    expect(msg).not.toMatch(/profiles_pkey|duplicate/);
    expect(msg).toMatch(/Não foi possível/);
  });
});
