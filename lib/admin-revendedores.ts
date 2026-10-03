import { traduzirPorLista } from "@/lib/admin-erros";
import type { Papel } from "@/lib/roles";
import type { Revendedor } from "@/lib/types";
import { cnpjValido, emailValido, mascararCnpj, mascararWhatsapp } from "@/lib/validators";

export type RevendedorForm = {
  razao_social: string;
  cnpj: string;
  responsavel: string;
  email: string;
  whatsapp: string;
  cidade: string;
  uf: string;
};

export type RevendedorPayload = RevendedorForm;

export type ErrosRevendedor = Partial<Record<keyof RevendedorForm, string>>;

export const REVENDEDOR_VAZIO: RevendedorForm = {
  razao_social: "",
  cnpj: "",
  responsavel: "",
  email: "",
  whatsapp: "",
  cidade: "",
  uf: "",
};

function whatsappSemTruncar(v: string): string {
  return v.replace(/\D/g, "").length > 11 ? v : mascararWhatsapp(v);
}

export function revendedorParaForm(r: Revendedor): RevendedorForm {
  return {
    razao_social: r.razao_social ?? "",
    cnpj: mascararCnpj(r.cnpj ?? ""),
    responsavel: r.responsavel ?? "",
    email: r.email ?? "",
    whatsapp: whatsappSemTruncar(r.whatsapp ?? ""),
    cidade: r.cidade ?? "",
    uf: r.uf ?? "",
  };
}

/** Devolve sempre o conjunto completo de campos: o upsert do banco grava tudo o que recebe. */
export function validarRevendedor(form: RevendedorForm): {
  erros: ErrosRevendedor;
  payload: RevendedorPayload | null;
} {
  const erros: ErrosRevendedor = {};
  const razao = form.razao_social.trim();
  const email = form.email.trim().toLowerCase();
  const uf = form.uf.trim().toUpperCase();
  const cnpjDigitos = form.cnpj.replace(/\D/g, "");
  const whatsDigitos = form.whatsapp.replace(/\D/g, "");

  if (!razao) erros.razao_social = "Informe a razão social.";
  else if (razao.length > 200) erros.razao_social = "A razão social pode ter no máximo 200 caracteres.";
  if (!email) erros.email = "Informe o e-mail.";
  else if (!emailValido(email) || email.length > 200) erros.email = "E-mail inválido.";
  if (form.cnpj.trim() && !cnpjValido(form.cnpj)) erros.cnpj = "CNPJ inválido.";
  if (whatsDigitos && (whatsDigitos.length < 10 || whatsDigitos.length > 11)) {
    erros.whatsapp = "WhatsApp incompleto. Use DDD e número.";
  }
  if (uf && !/^[A-Z]{2}$/.test(uf)) erros.uf = "Use as 2 letras do estado.";

  if (Object.keys(erros).length > 0) return { erros, payload: null };
  return {
    erros,
    payload: {
      razao_social: razao,
      cnpj: cnpjDigitos,
      responsavel: form.responsavel.trim(),
      email,
      whatsapp: whatsDigitos,
      cidade: form.cidade.trim(),
      uf,
    },
  };
}

export function avisoTrocaEmail(
  papel: Papel,
  atual: Pick<Revendedor, "email" | "status"> | null,
  novoEmail: string
): string | null {
  if (papel !== "supervisor" || !atual || atual.status !== "aprovado") return null;
  if (novoEmail.trim().toLowerCase() === atual.email.trim().toLowerCase()) return null;
  return "Trocar o e-mail de um revendedor aprovado o devolve para Cadastro pendente, até um admin aprovar de novo.";
}

export function traduzirErroRevendedor(mensagem: string): string {
  return traduzirPorLista(
    mensagem,
    [
      [/e-mail já cadastrado/, "Esse e-mail já está cadastrado em outro revendedor."],
      [/razão social obrigatória/, "Informe a razão social."],
      [/e-mail inválido/, "E-mail inválido."],
      [/revendedor não encontrado/, "Revendedor não encontrado. Atualize a página."],
    ],
    "Não foi possível salvar o revendedor agora. Tente de novo."
  );
}
