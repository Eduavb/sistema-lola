import { describe, expect, it } from "vitest";
import {
  COOKIE_AT,
  COOKIE_RT,
  MARGEM_RENOVACAO_S,
  REFRESH_MAX_AGE_S,
  analisarToken,
  decodificarPayloadJwt,
  maxAgeAccess,
  mensagemErroAuth,
  opcoesCookie,
  origemSite,
  perfilDeJson,
  resultadoCadastro,
  MSG_CADASTRO_ENVIADO,
  MSG_REVENDEDOR_ENVIADO,
} from "@/lib/auth-cookies";

function b64url(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function jwtFalso(payload: Record<string, unknown>): string {
  return `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url(payload)}.assinatura-de-teste`;
}

const AGORA = 1_800_000_000;
const SUB = "11111111-2222-3333-4444-555555555555";

function cabecalhos(mapa: Record<string, string>) {
  return { get: (nome: string) => mapa[nome.toLowerCase()] ?? null };
}

describe("constantes", () => {
  it("nomes e duração do refresh", () => {
    expect(COOKIE_AT).toBe("lola_at");
    expect(COOKIE_RT).toBe("lola_rt");
    expect(REFRESH_MAX_AGE_S).toBe(60 * 60 * 24 * 30);
    expect(MARGEM_RENOVACAO_S).toBe(60);
  });
});

describe("decodificarPayloadJwt", () => {
  it("lê o payload de um JWT bem formado", () => {
    expect(decodificarPayloadJwt(jwtFalso({ sub: SUB, exp: AGORA }))).toEqual({ sub: SUB, exp: AGORA });
  });

  it("aceita caracteres base64url (- e _)", () => {
    const payload = { sub: SUB, exp: AGORA, nome: "ÿÿÿ>>>???" };
    expect(decodificarPayloadJwt(jwtFalso(payload))).toEqual(payload);
  });

  it.each([
    ["vazio", ""],
    ["sem pontos", "abc"],
    ["duas partes", "a.b"],
    ["quatro partes", "a.b.c.d"],
    ["payload não JSON", `${b64url({})}.bmFvLWpzb24.x`],
    ["payload array", `${b64url({})}.${b64url([1, 2])}.x`],
    ["payload nulo", `${b64url({})}.${b64url(null)}.x`],
    ["payload com caractere inválido", `${b64url({})}.@@@.x`],
  ])("devolve null para token malformado (%s)", (_rotulo, token) => {
    expect(decodificarPayloadJwt(token)).toBeNull();
  });
});

describe("analisarToken", () => {
  it("token com folga não precisa renovar", () => {
    const t = jwtFalso({ sub: SUB, exp: AGORA + 3600 });
    expect(analisarToken(t, AGORA)).toEqual({ userId: SUB, exp: AGORA + 3600, expirado: false, renovar: false });
  });

  it("faltando menos de 60s pede renovação mas ainda não expirou", () => {
    const t = jwtFalso({ sub: SUB, exp: AGORA + 59 });
    expect(analisarToken(t, AGORA)).toMatchObject({ expirado: false, renovar: true });
  });

  it("exatamente 60s restantes não renova", () => {
    const t = jwtFalso({ sub: SUB, exp: AGORA + 60 });
    expect(analisarToken(t, AGORA)).toMatchObject({ expirado: false, renovar: false });
  });

  it("exp no passado está expirado e pede renovação", () => {
    const t = jwtFalso({ sub: SUB, exp: AGORA - 1 });
    expect(analisarToken(t, AGORA)).toMatchObject({ expirado: true, renovar: true });
  });

  it("exp igual a agora conta como expirado", () => {
    const t = jwtFalso({ sub: SUB, exp: AGORA });
    expect(analisarToken(t, AGORA)).toMatchObject({ expirado: true });
  });

  it.each([
    ["sem exp", { sub: SUB }],
    ["exp string", { sub: SUB, exp: String(AGORA + 3600) }],
    ["exp não finito", { sub: SUB, exp: null }],
    ["sem sub", { exp: AGORA + 3600 }],
    ["sub vazio", { sub: "", exp: AGORA + 3600 }],
  ])("devolve null quando o payload é inválido (%s)", (_rotulo, payload) => {
    expect(analisarToken(jwtFalso(payload), AGORA)).toBeNull();
  });

  it("devolve null para token malformado", () => {
    expect(analisarToken("nao-e-jwt", AGORA)).toBeNull();
  });
});

describe("opcoesCookie", () => {
  it("em produção é secure", () => {
    expect(opcoesCookie(3600, "production")).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 3600,
    });
  });

  it("em desenvolvimento não é secure (localhost em http)", () => {
    expect(opcoesCookie(3600, "development")).toMatchObject({ httpOnly: true, secure: false, sameSite: "lax", path: "/" });
  });

  it("ambiente indefinido não é secure", () => {
    expect(opcoesCookie(10, undefined).secure).toBe(false);
  });
});

describe("maxAgeAccess", () => {
  it("usa expires_in válido", () => {
    expect(maxAgeAccess(3600)).toBe(3600);
    expect(maxAgeAccess(120.7)).toBe(120);
  });

  it.each([undefined, null, 0, -5, Number.NaN, Number.POSITIVE_INFINITY])("cai em 3600 para %s", (v) => {
    expect(maxAgeAccess(v as number | undefined | null)).toBe(3600);
  });
});

describe("origemSite", () => {
  const SITE = "https://lola.com.br";

  describe("com NEXT_PUBLIC_SITE_URL definida", () => {
    it("usa sempre a env, ignorando origin e host", () => {
      const h = cabecalhos({ origin: "https://evil.com", host: "evil.com", "x-forwarded-proto": "https" });
      expect(origemSite(h, SITE, "production")).toBe(SITE);
      expect(origemSite(h, SITE, "development")).toBe(SITE);
    });

    it("normaliza a env com caminho", () => {
      expect(origemSite(cabecalhos({}), "https://lola.com.br/qualquer", "production")).toBe(SITE);
    });

    it("env inválida em produção não cai nos headers", () => {
      expect(origemSite(cabecalhos({ origin: "https://evil.com" }), "lixo", "production")).toBe("");
    });
  });

  describe("sem env em produção", () => {
    it("ignora origin e host e devolve vazio", () => {
      const h = cabecalhos({ origin: "https://evil.com", host: "evil.com" });
      expect(origemSite(h, undefined, "production")).toBe("");
      expect(origemSite(h, "", "production")).toBe("");
    });
  });

  describe("sem env fora de produção (fallback de desenvolvimento)", () => {
    const dev = (mapa: Record<string, string>) => origemSite(cabecalhos(mapa), undefined, "development");

    it("prefere o cabeçalho origin", () => {
      expect(dev({ origin: "https://lola.com.br", host: "outro.com" })).toBe(SITE);
    });

    it("normaliza origin com caminho", () => {
      expect(dev({ origin: "https://lola.com.br/qualquer" })).toBe(SITE);
    });

    it("usa host e x-forwarded-proto sem origin", () => {
      expect(dev({ host: "lola.com.br", "x-forwarded-proto": "https" })).toBe(SITE);
    });

    it("aceita localhost com porta e proto http", () => {
      expect(dev({ host: "localhost:3000", "x-forwarded-proto": "http" })).toBe("http://localhost:3000");
    });

    it("x-forwarded-proto com lista usa o primeiro", () => {
      expect(dev({ host: "lola.com.br", "x-forwarded-proto": "https,http" })).toBe(SITE);
    });

    it("sem proto assume https", () => {
      expect(dev({ host: "lola.com.br" })).toBe(SITE);
    });

    it.each([
      ["origin null", { origin: "null" }],
      ["origin javascript", { origin: "javascript:alert(1)" }],
      ["host com barra", { host: "lola.com.br/evil" }],
      ["host com arroba", { host: "evil.com@lola.com.br" }],
      ["proto estranho", { host: "lola.com.br", "x-forwarded-proto": "ftp" }],
      ["nada", {}],
    ])("rejeita valores suspeitos (%s)", (_rotulo, mapa) => {
      expect(dev(mapa)).toBe("");
    });
  });
});

describe("mensagemErroAuth", () => {
  it("credenciais inválidas", () => {
    expect(mensagemErroAuth({ code: "invalid_credentials", status: 400 })).toBe("E-mail ou senha incorretos.");
    expect(mensagemErroAuth({ message: "Invalid login credentials", status: 400 })).toBe("E-mail ou senha incorretos.");
  });

  it("e-mail não confirmado", () => {
    expect(mensagemErroAuth({ code: "email_not_confirmed" })).toBe("Confirme seu e-mail para entrar.");
    expect(mensagemErroAuth({ message: "Email not confirmed" })).toBe("Confirme seu e-mail para entrar.");
  });

  it("limite de tentativas", () => {
    const msg = "Muitas tentativas. Aguarde alguns minutos e tente de novo.";
    expect(mensagemErroAuth({ code: "over_request_rate_limit" })).toBe(msg);
    expect(mensagemErroAuth({ code: "over_email_send_rate_limit" })).toBe(msg);
    expect(mensagemErroAuth({ status: 429 })).toBe(msg);
  });

  it("senha fraca e senha repetida", () => {
    expect(mensagemErroAuth({ code: "weak_password" })).toMatch(/^Senha fraca/);
    expect(mensagemErroAuth({ code: "same_password" })).toBe("A nova senha precisa ser diferente da atual.");
  });

  it("token de redefinição inválido", () => {
    const msg = "Link de redefinição inválido ou expirado. Peça um novo.";
    expect(mensagemErroAuth({ code: "bad_jwt" }, "redefinir")).toBe(msg);
    expect(mensagemErroAuth({ status: 401 }, "redefinir")).toBe(msg);
    expect(mensagemErroAuth({ code: "session_not_found", status: 403 }, "redefinir")).toBe(msg);
  });

  it("erro desconhecido não vaza a mensagem original", () => {
    const msg = mensagemErroAuth({ code: "unexpected_failure", message: "db timeout at pg_xyz" });
    expect(msg).toBe("Não foi possível concluir agora. Tente de novo.");
    expect(mensagemErroAuth(null)).toBe("Não foi possível concluir agora. Tente de novo.");
  });
});

describe("resultadoCadastro", () => {
  it.each(["cliente", "revendedor"] as const)("%s: sucesso e e-mail existente dão resultado idêntico", (tipo) => {
    const novo = resultadoCadastro(null, tipo);
    expect(novo).toEqual({ sent: tipo === "cliente" ? MSG_CADASTRO_ENVIADO : MSG_REVENDEDOR_ENVIADO });
    expect(resultadoCadastro({ code: "user_already_exists", message: "User already registered", status: 422 }, tipo)).toEqual(novo);
    expect(resultadoCadastro({ code: "email_exists", status: 422 }, tipo)).toEqual(novo);
  });

  it("textos neutros", () => {
    expect(MSG_CADASTRO_ENVIADO).toBe(
      "Enviamos um link de confirmação para o seu e-mail. Confirme para entrar. Se você já tem conta, entre ou redefina a senha."
    );
    expect(MSG_REVENDEDOR_ENVIADO).toBe(
      `Solicitação enviada. Seu cadastro está pendente de aprovação. ${MSG_CADASTRO_ENVIADO}`
    );
  });

  it("outros erros viram mensagem de erro mapeada", () => {
    expect(resultadoCadastro({ code: "weak_password" }, "cliente")).toEqual({
      error: mensagemErroAuth({ code: "weak_password" }),
    });
    expect(resultadoCadastro({ status: 429 }, "revendedor").error).toMatch(/^Muitas tentativas/);
  });
});

describe("perfilDeJson", () => {
  const base = { id: SUB, email: "a@b.com", nome: "Ana", papel: "cliente", ativo: true, ultimo_acesso: null };

  it("aceita um perfil válido e descarta campos extras", () => {
    expect(perfilDeJson(base)).toEqual({ id: SUB, email: "a@b.com", nome: "Ana", papel: "cliente", ativo: true });
  });

  it("nome nulo vira string vazia", () => {
    expect(perfilDeJson({ ...base, nome: null })?.nome).toBe("");
  });

  it.each([
    ["nulo", null],
    ["string", "x"],
    ["papel desconhecido", { ...base, papel: "root" }],
    ["sem id", { ...base, id: undefined }],
    ["ativo não booleano", { ...base, ativo: "true" }],
  ])("rejeita %s", (_rotulo, valor) => {
    expect(perfilDeJson(valor)).toBeNull();
  });
});
