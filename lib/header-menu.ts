import { ehEquipe, type Papel } from "@/lib/roles";

export type CategoriaNav = { slug: string; nome: string };
export type PerfilNav = { nome: string; papel: Papel };
export type ItemMenuConta =
  | { tipo: "link"; rotulo: string; href: string }
  | { tipo: "sair"; rotulo: string };

export function itensMenuConta(perfil: PerfilNav): ItemMenuConta[] {
  // Cada perfil vê só o seu destino: equipe no painel, revendedor no atacado, cliente em Minha conta.
  const destino: ItemMenuConta = ehEquipe(perfil.papel)
    ? { tipo: "link", rotulo: "Painel", href: "/admin" }
    : perfil.papel === "revendedor"
      ? { tipo: "link", rotulo: "Painel de atacado", href: "/atacado" }
      : { tipo: "link", rotulo: "Minha conta", href: "/minha-conta" };
  return [destino, { tipo: "sair", rotulo: "Sair" }];
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

export type DadosPublicosHeader = {
  categorias: CategoriaNav[];
  avisoTexto: string;
  avisoAtivo: string;
};

export function dadosPublicosHeader(
  d: DadosPublicosHeader & { perfil?: unknown }
): DadosPublicosHeader {
  return { categorias: d.categorias, avisoTexto: d.avisoTexto, avisoAtivo: d.avisoAtivo };
}

export function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? "";
}
