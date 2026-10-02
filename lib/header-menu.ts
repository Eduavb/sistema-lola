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

export function destinoAjuda(
  link: string | undefined,
  whatsappUrl: string
): { href: string; externo: boolean } {
  const alvo = (link ?? "").trim();
  if (!alvo) return { href: whatsappUrl, externo: true };
  return { href: alvo, externo: /^https?:\/\//i.test(alvo) };
}

export function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? "";
}
