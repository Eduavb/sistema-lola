import { precoVarejoEfetivo } from "@/lib/pricing";

export const LIMITE_LANCAMENTOS = 8;

export const COR_BLOCO_CATEGORIA = ["#FFE4EC", "#DDF7EE", "#EFE0DB", "#EEE5FF", "#FFEBDA"];

export function corBlocoCategoria(indice: number): string {
  const n = COR_BLOCO_CATEGORIA.length;
  return COR_BLOCO_CATEGORIA[((indice % n) + n) % n];
}

export type ProdutoLancamento = {
  id: string;
  nome: string;
  ordem: number;
  ativo: boolean;
  created_at?: string | null;
  colors: { sizes: { estoque: number }[] }[];
};

function temEstoque(p: Pick<ProdutoLancamento, "colors">): boolean {
  return p.colors.reduce((s, c) => s + c.sizes.reduce((t, z) => t + z.estoque, 0), 0) > 0;
}

function instante(valor: string | null | undefined): number {
  const t = valor ? Date.parse(valor) : NaN;
  return Number.isNaN(t) ? 0 : t;
}

export function selecionarLancamentos<T extends ProdutoLancamento>(
  produtos: T[],
  limite = LIMITE_LANCAMENTOS
): T[] {
  return produtos
    .filter((p) => p.ativo && temEstoque(p))
    .sort(
      (a, b) =>
        instante(b.created_at) - instante(a.created_at) ||
        a.ordem - b.ordem ||
        a.nome.localeCompare(b.nome, "pt-BR")
    )
    .slice(0, limite);
}

const LINK_PADRAO = "#lancamentos";

export function ctaLinkSeguro(link: unknown, fallback = LINK_PADRAO): string {
  if (typeof link !== "string") return fallback;
  if (link !== link.trim() || link === "") return fallback;
  if (/[\u0000- \u007f\\]/.test(link)) return fallback;
  if (link.startsWith("//")) return fallback;
  if (link.startsWith("/") || link.startsWith("#") || link.startsWith("https://")) return link;
  return fallback;
}

export type BannerHero = {
  etiqueta: string;
  titulo: string;
  subtitulo: string;
  cta1_texto: string;
  cta1_link: string;
  cta2_texto: string;
  cta2_mostrar: boolean;
  imagem: string | null;
};

export const BANNER_PADRAO: BannerHero = {
  etiqueta: "COLEÇÃO VERÃO 26",
  titulo: "Pisa confiante.",
  subtitulo: "Tênis, sandálias e bolsas pra quem já sabe onde quer chegar.",
  cta1_texto: "Ver coleção",
  cta1_link: "#lancamentos",
  cta2_texto: "Comprar por categoria",
  cta2_mostrar: true,
  imagem: null,
};

function textoOuPadrao(valor: unknown, padrao: string): string {
  return typeof valor === "string" && valor.trim() !== "" ? valor : padrao;
}

export function normalizarBanner(dados: unknown): BannerHero {
  if (!dados || typeof dados !== "object" || Array.isArray(dados)) return { ...BANNER_PADRAO };
  const d = dados as Record<string, unknown>;
  const imagem =
    typeof d.imagem === "string" && /^data:image\/(?!svg)[a-z0-9.+-]+;base64,/i.test(d.imagem)
      ? d.imagem
      : null;
  return {
    etiqueta: textoOuPadrao(d.etiqueta, BANNER_PADRAO.etiqueta),
    titulo: textoOuPadrao(d.titulo, BANNER_PADRAO.titulo),
    subtitulo: textoOuPadrao(d.subtitulo, BANNER_PADRAO.subtitulo),
    cta1_texto: textoOuPadrao(d.cta1_texto, BANNER_PADRAO.cta1_texto),
    cta1_link: ctaLinkSeguro(d.cta1_link, BANNER_PADRAO.cta1_link),
    cta2_texto: textoOuPadrao(d.cta2_texto, BANNER_PADRAO.cta2_texto),
    cta2_mostrar: typeof d.cta2_mostrar === "boolean" ? d.cta2_mostrar : BANNER_PADRAO.cta2_mostrar,
    imagem,
  };
}

export function formatarReais(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function textoParcela3x(preco: number): string {
  return `ou 3x ${formatarReais(preco / 3)}`;
}

export type CartaoLancamento = {
  id: string;
  slug: string | null;
  nome: string;
  categoria: string;
  imagem: string | null;
  preco: number;
  precoOriginal: number | null;
  cores: { nome: string; hex: string }[];
};

export function paraCartaoLancamento(p: {
  id: string;
  slug: string | null;
  nome: string;
  preco: number;
  desconto_efetivo?: number | null;
  categoria?: { nome: string } | null;
  colors: { nome: string; hex: string | null; imagens: string[] }[];
}): CartaoLancamento {
  const { final, original, pct } = precoVarejoEfetivo(p);
  return {
    id: p.id,
    slug: p.slug,
    nome: p.nome,
    categoria: p.categoria?.nome ?? "",
    imagem: p.colors[0]?.imagens?.[0] ?? null,
    preco: final,
    precoOriginal: pct != null ? original : null,
    cores: p.colors.map((c) => ({ nome: c.nome, hex: c.hex || "#CCCCCC" })),
  };
}
