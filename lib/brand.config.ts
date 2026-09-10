// Identidade da marca. Trocar aqui + as CSS vars em app/globals.css
// para rebrandar sem tocar em componente.
export const BRAND = {
  nome: "LOLA",
  tagline: "Calçados e acessórios",
  // Preencher com o WhatsApp real da loja (só dígitos, com DDI 55).
  whatsapp: "5581000000000",
  get whatsappUrl() {
    return `https://wa.me/${this.whatsapp}`;
  },
  instagram: null as string | null,
  get instagramUrl() {
    return this.instagram ? `https://instagram.com/${this.instagram}` : null;
  },
  email: null as string | null,
} as const;
