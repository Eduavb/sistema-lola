import { nextSeguro } from "@/lib/validators";

export type Papel = "superadmin" | "admin" | "supervisor" | "revendedor" | "cliente";

export const PAPEIS: Papel[] = ["superadmin", "admin", "supervisor", "revendedor", "cliente"];
export const EQUIPE: Papel[] = ["superadmin", "admin", "supervisor"];

export type Tela =
  | "visao-geral"
  | "pedidos"
  | "financeiro"
  | "produtos"
  | "promocoes"
  | "banner"
  | "textos"
  | "revendedores"
  | "usuarios"
  | "config";

const MENU: Tela[] = [
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

const ACESSO: Record<Papel, Tela[]> = {
  superadmin: MENU,
  admin: MENU.filter((t) => t !== "config"),
  supervisor: ["visao-geral", "pedidos", "revendedores"],
  revendedor: [],
  cliente: [],
};

export function podeAcessar(papel: Papel, tela: Tela): boolean {
  return ACESSO[papel].includes(tela);
}

export function telasVisiveis(papel: Papel): Tela[] {
  return MENU.filter((t) => podeAcessar(papel, t));
}

export function ehEquipe(papel: Papel): boolean {
  return EQUIPE.includes(papel);
}

export function podeAprovarRevendedor(papel: Papel): boolean {
  return papel === "superadmin" || papel === "admin";
}

export function podeEditarRevendedor(papel: Papel): boolean {
  return ehEquipe(papel);
}

export function podeGerirPapel(ator: Papel, alvo: Papel): boolean {
  if (ator === "superadmin") return true;
  if (ator === "admin") return alvo !== "superadmin";
  return false;
}

export function destinoPosLogin(papel: Papel, next?: string | null): string {
  if (ehEquipe(papel)) return "/admin";
  if (papel === "revendedor") return "/atacado";
  return nextSeguro(next);
}
