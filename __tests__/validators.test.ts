import { describe, it, expect } from "vitest";
import {
  mascararCnpj,
  mascararWhatsapp,
  cnpjValido,
  emailValido,
  nextSeguro,
} from "@/lib/validators";

describe("mascararCnpj", () => {
  it("entrada parcial", () => {
    expect(mascararCnpj("")).toBe("");
    expect(mascararCnpj("1")).toBe("1");
    expect(mascararCnpj("112")).toBe("11.2");
    expect(mascararCnpj("11222")).toBe("11.222");
    expect(mascararCnpj("112223")).toBe("11.222.3");
    expect(mascararCnpj("11222333")).toBe("11.222.333");
    expect(mascararCnpj("112223330001")).toBe("11.222.333/0001");
    expect(mascararCnpj("1122233300018")).toBe("11.222.333/0001-8");
  });
  it("completo e excedente", () => {
    expect(mascararCnpj("11222333000181")).toBe("11.222.333/0001-81");
    expect(mascararCnpj("112223330001819999")).toBe("11.222.333/0001-81");
  });
  it("remove letras e reaplica sobre valor já mascarado", () => {
    expect(mascararCnpj("ab11x222")).toBe("11.222");
    expect(mascararCnpj("11.222.333/0001-81")).toBe("11.222.333/0001-81");
  });
});

describe("mascararWhatsapp", () => {
  it("entrada parcial", () => {
    expect(mascararWhatsapp("")).toBe("");
    expect(mascararWhatsapp("1")).toBe("1");
    expect(mascararWhatsapp("11")).toBe("11");
    expect(mascararWhatsapp("119")).toBe("(11) 9");
    expect(mascararWhatsapp("1198765")).toBe("(11) 98765");
    expect(mascararWhatsapp("11987654")).toBe("(11) 98765-4");
  });
  it("completo e excedente", () => {
    expect(mascararWhatsapp("11987654321")).toBe("(11) 98765-4321");
    expect(mascararWhatsapp("119876543219999")).toBe("(11) 98765-4321");
  });
  it("remove letras", () => {
    expect(mascararWhatsapp("(1a1) 9b8765-4321")).toBe("(11) 98765-4321");
  });
});

describe("cnpjValido", () => {
  it("aceita CNPJ válido com ou sem máscara", () => {
    expect(cnpjValido("11.222.333/0001-81")).toBe(true);
    expect(cnpjValido("11222333000181")).toBe(true);
  });
  it("rejeita dígito verificador errado", () => {
    expect(cnpjValido("11.222.333/0001-82")).toBe(false);
    expect(cnpjValido("11.222.333/0001-91")).toBe(false);
  });
  it("rejeita sequências repetidas", () => {
    expect(cnpjValido("11.111.111/1111-11")).toBe(false);
    expect(cnpjValido("00000000000000")).toBe(false);
  });
  it("rejeita tamanho errado", () => {
    expect(cnpjValido("11.222.333/0001-8")).toBe(false);
    expect(cnpjValido("1122233300018")).toBe(false);
    expect(cnpjValido("112223330001811")).toBe(false);
    expect(cnpjValido("")).toBe(false);
  });
  it("rejeita letras", () => {
    expect(cnpjValido("11.222.333/000A-81")).toBe(false);
    expect(cnpjValido("abcdefghijklmn")).toBe(false);
  });
});

describe("emailValido", () => {
  it("aceita e-mails simples", () => {
    expect(emailValido("a@b.co")).toBe(true);
    expect(emailValido("nome.sobrenome+x@loja.com.br")).toBe(true);
  });
  it("rejeita formatos inválidos", () => {
    expect(emailValido("")).toBe(false);
    expect(emailValido("sem-arroba.com")).toBe(false);
    expect(emailValido("a@b")).toBe(false);
    expect(emailValido("@b.com")).toBe(false);
  });
  it("rejeita espaços", () => {
    expect(emailValido("a b@c.com")).toBe(false);
    expect(emailValido(" a@b.com")).toBe(false);
    expect(emailValido("a@b.com ")).toBe(false);
  });
});

describe("nextSeguro", () => {
  it("aceita caminhos internos", () => {
    expect(nextSeguro("/carrinho")).toBe("/carrinho");
    expect(nextSeguro("/produto/1?x=2")).toBe("/produto/1?x=2");
    expect(nextSeguro("/")).toBe("/");
  });
  it.each([
    "//evil.com",
    "/\\evil",
    "https://x",
    "javascript:alert(1)",
    "carrinho",
    "",
    null,
    undefined,
  ])("rejeita %j", (v) => {
    expect(nextSeguro(v)).toBe("/");
  });
});
