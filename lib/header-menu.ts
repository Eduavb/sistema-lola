import { ehEquipe, type Papel } from "@/lib/roles";

export type CategoriaNav = { slug: string; nome: string };
export type PerfilNav = { nome: string; papel: Papel };
export type ItemMenuConta =
  | { tipo: "link"; rotulo: string; href: string }
  | { tipo: "sair"; rotulo: string };

export function itensMenuConta(perfil: PerfilNav): ItemMenuConta[] {
  const itens: ItemMenuConta[] = [{ tipo: "link", rotulo: "Minha conta", href: "/minha-conta" }];
  if (ehEquipe(perfil.papel)) itens.push({ tipo: "link", rotulo: "Painel", href: "/admin" });
  if (perfil.papel === "revendedor") {
    itens.push({ tipo: "link", rotulo: "Painel de atacado", href: "/atacado" });
  }
  itens.push({ tipo: "sair", rotulo: "Sair" });
  return itens;
}

export function linksCategorias(categorias: CategoriaNav[]): { href: string; rotulo: string }[] {
  return [
    ...categorias.map((c) => ({ href: `/#cat-${c.slug}`, rotulo: c.nome })),
    { href: "/#lancamentos", rotulo: "Lançamentos" },
  ];
}

export type DestinoAjuda = { href: string; tipo: "nova-aba" | "simples" | "interno" };

export function destinoAjuda(link: string | null | undefined, whatsappUrl: string): DestinoAjuda {
  const padrao: DestinoAjuda = { href: whatsappUrl, tipo: "nova-aba" };
  if (typeof link !== "string" || link === "") return padrao;
  if (/[\s\u0000-\u001f\u007f\\]/.test(link)) return padrao;
  if (/^https?:\/\/[^/]/i.test(link)) return { href: link, tipo: "nova-aba" };
  if (/^(mailto|tel):\S+/i.test(link)) return { href: link, tipo: "simples" };
  if (/^\/(?!\/)/.test(link)) return { href: link, tipo: "interno" };
  if (/^#\S+/.test(link)) return { href: link, tipo: "simples" };
  return padrao;
}

export function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? "";
}
