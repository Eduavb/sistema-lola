import { PAPEIS, type Papel } from "@/lib/roles";

export const COOKIE_AT = "lola_at";
export const COOKIE_RT = "lola_rt";
export const REFRESH_MAX_AGE_S = 60 * 60 * 24 * 30;
export const MARGEM_RENOVACAO_S = 60;
const ACCESS_MAX_AGE_PADRAO_S = 3600;

export type Perfil = {
  id: string;
  email: string;
  nome: string;
  papel: Papel;
  ativo: boolean;
};

export type InfoToken = {
  userId: string;
  exp: number;
  expirado: boolean;
  renovar: boolean;
};

export type OpcoesCookie = {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: "/";
  maxAge: number;
};

export type ErroAuth = { code?: string; status?: number; message?: string } | null | undefined;

export type ContextoErro = "entrar" | "cadastro" | "redefinir" | "geral";

type LeitorCabecalhos = { get(nome: string): string | null };

function base64UrlParaTexto(parte: string): string | null {
  if (!/^[A-Za-z0-9_-]+$/.test(parte)) return null;
  const b64 = parte.replace(/-/g, "+").replace(/_/g, "/");
  const preenchido = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  try {
    const bin = atob(preenchido);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

export function decodificarPayloadJwt(token: string): Record<string, unknown> | null {
  const partes = token.split(".");
  if (partes.length !== 3) return null;
  const texto = base64UrlParaTexto(partes[1]);
  if (texto === null) return null;
  try {
    const valor: unknown = JSON.parse(texto);
    if (!valor || typeof valor !== "object" || Array.isArray(valor)) return null;
    return valor as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function analisarToken(token: string, agoraS: number): InfoToken | null {
  const payload = decodificarPayloadJwt(token);
  if (!payload) return null;
  const { exp, sub } = payload;
  if (typeof exp !== "number" || !Number.isFinite(exp)) return null;
  if (typeof sub !== "string" || !sub) return null;
  const restante = exp - agoraS;
  return {
    userId: sub,
    exp,
    expirado: restante <= 0,
    renovar: restante < MARGEM_RENOVACAO_S,
  };
}

export function opcoesCookie(maxAge: number, ambiente: string | undefined = process.env.NODE_ENV): OpcoesCookie {
  return {
    httpOnly: true,
    secure: ambiente === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  };
}

export function maxAgeAccess(expiresIn: number | null | undefined): number {
  if (typeof expiresIn !== "number" || !Number.isFinite(expiresIn) || expiresIn <= 0) {
    return ACCESS_MAX_AGE_PADRAO_S;
  }
  return Math.floor(expiresIn);
}

function origemValida(valor: string | null | undefined): string | null {
  if (!valor) return null;
  try {
    const url = new URL(valor);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function origemSite(cabecalhos: LeitorCabecalhos, fallback?: string): string {
  const doOrigin = origemValida(cabecalhos.get("origin"));
  if (doOrigin) return doOrigin;

  const host = cabecalhos.get("host");
  const proto = (cabecalhos.get("x-forwarded-proto") ?? "https").split(",")[0].trim().toLowerCase();
  if (host && /^[a-z0-9.-]+(:\d{1,5})?$/i.test(host) && (proto === "https" || proto === "http")) {
    const montada = origemValida(`${proto}://${host}`);
    if (montada) return montada;
  }

  return origemValida(fallback) ?? "";
}

const MSG_GENERICA = "Não foi possível concluir agora. Tente de novo.";
const MSG_LIMITE = "Muitas tentativas. Aguarde alguns minutos e tente de novo.";
const MSG_LINK_INVALIDO = "Link de redefinição inválido ou expirado. Peça um novo.";

export function mensagemErroAuth(erro: ErroAuth, contexto: ContextoErro = "geral"): string {
  if (!erro) return MSG_GENERICA;
  const code = erro.code ?? "";
  const msg = (erro.message ?? "").toLowerCase();

  if (code === "over_request_rate_limit" || code === "over_email_send_rate_limit" || erro.status === 429) {
    return MSG_LIMITE;
  }
  if (code === "invalid_credentials" || msg.includes("invalid login credentials")) {
    return "E-mail ou senha incorretos.";
  }
  if (code === "email_not_confirmed" || msg.includes("email not confirmed")) {
    return "Confirme seu e-mail para entrar.";
  }
  if (code === "weak_password") {
    return "Senha fraca. Use ao menos 8 caracteres, misturando letras e números.";
  }
  if (code === "same_password") {
    return "A nova senha precisa ser diferente da atual.";
  }
  if (code === "email_address_invalid" || code === "validation_failed") {
    return "Confira os dados informados.";
  }
  if (code === "signup_disabled") {
    return "Cadastro indisponível no momento.";
  }
  if (code === "user_already_exists" || code === "email_exists") {
    return "Não foi possível concluir o cadastro. Se você já tem conta, entre ou redefina a senha.";
  }
  if (
    contexto === "redefinir" &&
    (code === "bad_jwt" || code === "session_not_found" || code === "session_expired" ||
      code === "user_not_found" || erro.status === 401 || erro.status === 403)
  ) {
    return MSG_LINK_INVALIDO;
  }
  return MSG_GENERICA;
}

export function perfilDeJson(valor: unknown): Perfil | null {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return null;
  const v = valor as Record<string, unknown>;
  if (typeof v.id !== "string" || !v.id) return null;
  if (typeof v.papel !== "string" || !PAPEIS.includes(v.papel as Papel)) return null;
  if (typeof v.ativo !== "boolean") return null;
  return {
    id: v.id,
    email: typeof v.email === "string" ? v.email : "",
    nome: typeof v.nome === "string" ? v.nome : "",
    papel: v.papel as Papel,
    ativo: v.ativo,
  };
}
