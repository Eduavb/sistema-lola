// Identidade da marca. Trocar aqui + as CSS vars em app/globals.css
// para rebrandar sem tocar em componente.
export const BRAND = {
  nome: "LOLA",
  tagline: "Calçados e acessórios",
  // WhatsApp da loja (só dígitos, com DDI 55).
  whatsapp: "5581987307223",
  get whatsappUrl() {
    return `https://wa.me/${this.whatsapp}`;
  },
  instagram: null as string | null,
  get instagramUrl() {
    return this.instagram ? `https://instagram.com/${this.instagram}` : null;
  },
  email: null as string | null,
} as const;

type CorCategoria = { base: string; deep: string };

const COR_PADRAO: CorCategoria = { base: "var(--peach)", deep: "var(--peach-deep)" };

// Cor por categoria: cada grupo de produto (calçados/acessórios) ganha
// um tom da paleta "Bright Pastels", usado no swing tag do produto e
// nos chips de categoria da Home. Ver docs/superpowers/specs/2026-09-15-loja-lola-home-recriacao-design.md.
export function corDaCategoria(
  categoria:
    | { grupo?: "calcados" | "acessorios" | null; nome?: string | null }
    | null
    | undefined
): CorCategoria {
  if (!categoria) return COR_PADRAO;
  const nome = (categoria.nome ?? "").toLowerCase();

  if (categoria.grupo === "calcados") {
    if (nome.includes("sandál") || nome.includes("sandal")) {
      return { base: "var(--mint)", deep: "var(--mint-deep)" };
    }
    if (nome.includes("sapatilh")) {
      return { base: "var(--lilac)", deep: "var(--lilac-deep)" };
    }
    return { base: "var(--pink)", deep: "var(--pink-deep)" };
  }

  if (categoria.grupo === "acessorios") {
    return COR_PADRAO;
  }

  return COR_PADRAO;
}
