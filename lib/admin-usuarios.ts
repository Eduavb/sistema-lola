import { traduzirPorLista } from "@/lib/admin-erros";
import { PAPEIS, podeGerirPapel, type Papel } from "@/lib/roles";
import { rotuloPapel } from "@/lib/admin-acesso";
import { emailValido } from "@/lib/validators";

export type Usuario = {
  id: string;
  email: string;
  nome: string;
  papel: Papel;
  ativo: boolean;
  ultimo_acesso: string | null;
  created_at: string;
};

export type Convite = { email: string; papel: Papel; created_at: string };

export type FiltroPapel = "todos" | Papel;

export const FILTROS_PAPEL: { valor: FiltroPapel; rotulo: string }[] = [
  { valor: "todos", rotulo: "Todos" },
  ...PAPEIS.map((p) => ({ valor: p as FiltroPapel, rotulo: rotuloPapel(p) })),
];

export function filtrarUsuarios(lista: Usuario[], filtro: FiltroPapel): Usuario[] {
  return filtro === "todos" ? lista : lista.filter((u) => u.papel === filtro);
}

export function rotuloUltimoAcesso(iso: string | null): string {
  if (!iso) return "Nunca";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Nunca";
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function rotuloStatus(ativo: boolean): string {
  return ativo ? "Ativo" : "Inativo";
}

export function inicialDoUsuario(u: Pick<Usuario, "nome" | "email">): string {
  const base = u.nome.trim() || u.email.trim();
  return (base[0] ?? "?").toUpperCase();
}

const CHIPS: Record<Papel, { bg: string; texto: string }> = {
  superadmin: { bg: "var(--adm-orange-bg)", texto: "var(--adm-orange-text)" },
  admin: { bg: "#FFF9F3", texto: "var(--adm-orange-text)" },
  supervisor: { bg: "var(--adm-purple-bg)", texto: "var(--adm-purple-text)" },
  cliente: { bg: "var(--adm-pink-bg)", texto: "var(--adm-pink-text)" },
  revendedor: { bg: "var(--adm-success-bg)", texto: "var(--adm-success-text)" },
};

export function chipPapel(papel: Papel): { bg: string; texto: string } {
  return CHIPS[papel];
}

export function opcoesDePapel(ator: Papel): Papel[] {
  return PAPEIS.filter((p) => podeGerirPapel(ator, p));
}

export function motivoSemEdicao(ator: Papel, alvo: Pick<Usuario, "id" | "papel">, meuId: string): string | null {
  if (alvo.id === meuId) return "Você não pode alterar o seu próprio usuário.";
  if (!podeGerirPapel(ator, alvo.papel)) {
    return `Seu papel não permite alterar um usuário ${rotuloPapel(alvo.papel).toLowerCase()}.`;
  }
  return null;
}

export function validarConvite(
  ator: Papel,
  emailBruto: string,
  papel: Papel
): { erros: { email?: string; papel?: string }; email: string } {
  const email = emailBruto.trim().toLowerCase();
  const erros: { email?: string; papel?: string } = {};
  if (!email) erros.email = "Informe o e-mail.";
  else if (!emailValido(email)) erros.email = "E-mail inválido.";
  if (!PAPEIS.includes(papel) || !podeGerirPapel(ator, papel)) {
    erros.papel = "Seu papel não permite atribuir esse papel.";
  }
  return { erros, email };
}

export function traduzirErroUsuarios(mensagem: string): string {
  return traduzirPorLista(
    mensagem,
    [
      [/próprio usuário/, "Você não pode alterar o seu próprio usuário."],
      [/ao menos um superadmin/, "É preciso manter ao menos um superadmin ativo."],
      [/ainda não confirmado/, "O e-mail dessa pessoa ainda não foi confirmado, então ela não pode receber esse papel."],
      [/convite não encontrado/, "Esse convite não existe mais (talvez a pessoa já tenha criado a conta)."],
      [/usuário não encontrado/, "Usuário não encontrado. Atualize a página."],
      [/e-mail inválido/, "E-mail inválido."],
      [/papel inválido/, "Papel inválido."],
    ],
    "Não foi possível salvar agora. Tente de novo."
  );
}
