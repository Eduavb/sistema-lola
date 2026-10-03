import { describe, it, expect } from "vitest";
import {
  REVENDEDOR_VAZIO,
  avisoTrocaEmail,
  revendedorParaForm,
  traduzirErroRevendedor,
  validarRevendedor,
  type RevendedorForm,
} from "@/lib/admin-revendedores";
import type { Revendedor } from "@/lib/types";

const ok: RevendedorForm = {
  ...REVENDEDOR_VAZIO,
  razao_social: "Loja Aurora",
  email: "aurora@exemplo.com",
};

const existente: Revendedor = {
  id: "r1",
  razao_social: "Loja Aurora",
  cnpj: "11222333000181",
  responsavel: "Marta",
  email: "aurora@exemplo.com",
  whatsapp: "41999998888",
  cidade: "Curitiba",
  uf: "PR",
  status: "aprovado",
  created_at: "2026-01-01T00:00:00Z",
  reviewed_at: null,
  reviewed_by: null,
  tem_conta: true,
};

describe("validarRevendedor", () => {
  it("mínimo válido", () => {
    const r = validarRevendedor(ok);
    expect(r.erros).toEqual({});
    expect(r.payload).toEqual({
      razao_social: "Loja Aurora",
      cnpj: "",
      responsavel: "",
      email: "aurora@exemplo.com",
      whatsapp: "",
      cidade: "",
      uf: "",
    });
  });
  it("exige razão social e e-mail válido", () => {
    expect(validarRevendedor({ ...ok, razao_social: " " }).erros.razao_social).toBeTruthy();
    expect(validarRevendedor({ ...ok, email: "x" }).erros.email).toBeTruthy();
    expect(validarRevendedor({ ...ok, email: "" }).erros.email).toBeTruthy();
  });
  it("CNPJ vazio passa; preenchido precisa ser válido", () => {
    expect(validarRevendedor({ ...ok, cnpj: "" }).erros.cnpj).toBeUndefined();
    expect(validarRevendedor({ ...ok, cnpj: "11.222.333/0001-81" }).erros.cnpj).toBeUndefined();
    expect(validarRevendedor({ ...ok, cnpj: "11.222.333/0001-80" }).erros.cnpj).toBeTruthy();
  });
  it("UF com duas letras, normalizada em maiúsculas", () => {
    expect(validarRevendedor({ ...ok, uf: "p" }).erros.uf).toBeTruthy();
    expect(validarRevendedor({ ...ok, uf: "p1" }).erros.uf).toBeTruthy();
    expect(validarRevendedor({ ...ok, uf: "pr" }).payload?.uf).toBe("PR");
  });
  it("WhatsApp incompleto é erro; completo vira dígitos", () => {
    expect(validarRevendedor({ ...ok, whatsapp: "(41) 9" }).erros.whatsapp).toBeTruthy();
    expect(validarRevendedor({ ...ok, whatsapp: "(41) 99999-8888" }).payload?.whatsapp).toBe("41999998888");
    expect(validarRevendedor({ ...ok, whatsapp: "(41) 3333-4444" }).erros.whatsapp).toBeUndefined();
  });
  it("e-mail em minúsculas e espaços aparados", () => {
    expect(validarRevendedor({ ...ok, email: " Aurora@Exemplo.com " }).payload?.email).toBe("aurora@exemplo.com");
  });
});

describe("revendedorParaForm", () => {
  it("traz todos os campos atuais, com máscara", () => {
    expect(revendedorParaForm(existente)).toEqual({
      razao_social: "Loja Aurora",
      cnpj: "11.222.333/0001-81",
      responsavel: "Marta",
      email: "aurora@exemplo.com",
      whatsapp: "(41) 99999-8888",
      cidade: "Curitiba",
      uf: "PR",
    });
  });
  it("editar sem mexer não apaga dados: payload preserva tudo", () => {
    const r = validarRevendedor(revendedorParaForm(existente));
    expect(r.payload).toEqual({
      razao_social: "Loja Aurora",
      cnpj: "11222333000181",
      responsavel: "Marta",
      email: "aurora@exemplo.com",
      whatsapp: "41999998888",
      cidade: "Curitiba",
      uf: "PR",
    });
  });
  it("não trunca WhatsApp salvo com mais de 11 dígitos", () => {
    expect(revendedorParaForm({ ...existente, whatsapp: "5541999998888" }).whatsapp).toBe("5541999998888");
  });
  it("campos nulos viram vazio", () => {
    expect(revendedorParaForm({ ...existente, cnpj: null }).cnpj).toBe("");
  });
});

describe("avisoTrocaEmail", () => {
  it("só supervisor, revendedor aprovado e e-mail diferente", () => {
    expect(avisoTrocaEmail("supervisor", existente, "novo@exemplo.com")).toMatch(/pendente/i);
    expect(avisoTrocaEmail("supervisor", existente, "AURORA@exemplo.com ")).toBeNull();
    expect(avisoTrocaEmail("admin", existente, "novo@exemplo.com")).toBeNull();
    expect(avisoTrocaEmail("supervisor", { ...existente, status: "pendente" }, "novo@exemplo.com")).toBeNull();
    expect(avisoTrocaEmail("supervisor", null, "novo@exemplo.com")).toBeNull();
  });
});

describe("traduzirErroRevendedor", () => {
  it("mapeia conhecidos e esconde o resto", () => {
    expect(traduzirErroRevendedor("e-mail já cadastrado")).toMatch(/já está cadastrado/);
    expect(traduzirErroRevendedor("razão social obrigatória")).toMatch(/razão social/i);
    expect(traduzirErroRevendedor("relation foo violates")).toMatch(/Não foi possível/);
  });
});
