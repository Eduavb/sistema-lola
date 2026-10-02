export type BannerDados = {
  etiqueta: string;
  titulo: string;
  subtitulo: string;
  cta1_texto: string;
  cta1_link: string;
  cta2_texto: string;
  cta2_mostrar: boolean;
  imagem: string | null;
};

export type BannerServidor = {
  rascunho: BannerDados | null;
  publicado: BannerDados;
  publicadoEm: string | null;
};

export const LIMITE_TEXTO_BANNER = 300;
export const LIMITE_DATA_URI = 3_000_000;
export const LARGURA_MAX_IMAGEM = 1600;
export const QUALIDADE_JPEG = 0.82;
export const LIMITE_ARQUIVO_ORIGEM = 25 * 1024 * 1024;
export const TIPOS_IMAGEM = ["image/jpeg", "image/png", "image/webp"];

export const BANNER_VAZIO: BannerDados = {
  etiqueta: "",
  titulo: "",
  subtitulo: "",
  cta1_texto: "",
  cta1_link: "",
  cta2_texto: "",
  cta2_mostrar: true,
  imagem: null,
};

const CAMPOS_TEXTO = ["etiqueta", "titulo", "subtitulo", "cta1_texto", "cta1_link", "cta2_texto"] as const;

export function normalizarBanner(raw: unknown): BannerDados {
  const resultado: BannerDados = { ...BANNER_VAZIO };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return resultado;
  const origem = raw as Record<string, unknown>;
  for (const campo of CAMPOS_TEXTO) {
    const valor = origem[campo];
    if (typeof valor === "string") resultado[campo] = valor;
  }
  if (typeof origem.cta2_mostrar === "boolean") resultado.cta2_mostrar = origem.cta2_mostrar;
  if (typeof origem.imagem === "string" && origem.imagem !== "") resultado.imagem = origem.imagem;
  return resultado;
}

export function normalizarServidor(raw: unknown): BannerServidor | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (!r.publicado || typeof r.publicado !== "object") return null;
  const publicado = normalizarBanner(r.publicado);
  const rascunho =
    r.rascunho && typeof r.rascunho === "object"
      ? normalizarBanner({ ...publicado, ...(r.rascunho as object) })
      : null;
  return {
    publicado,
    rascunho,
    publicadoEm: typeof r.publicado_em === "string" ? r.publicado_em : null,
  };
}

export const MSG_LINK_BOTAO = "O link deve começar com /, # ou https://, sem espaços.";

export function validarLinkBotao(link: string): string | null {
  const v = link.trim();
  if (v === "") return null;
  const inicioOk =
    (v.startsWith("/") && !v.startsWith("//")) || v.startsWith("#") || v.startsWith("https://");
  if (!inicioOk || /[\s\\\u0000-\u001f\u007f]/.test(v)) return MSG_LINK_BOTAO;
  return null;
}

export function validarTipoImagem(tipo: string): string | null {
  return TIPOS_IMAGEM.includes(tipo) ? null : "Use uma foto JPG, PNG ou WebP.";
}

export function validarDataUri(uri: string): string | null {
  return uri.length > LIMITE_DATA_URI
    ? "A foto ficou muito pesada mesmo depois de reduzida. Escolha uma imagem mais simples ou menor."
    : null;
}

export function dimensoesAlvo(largura: number, altura: number): { largura: number; altura: number } {
  if (largura <= LARGURA_MAX_IMAGEM) return { largura, altura };
  return {
    largura: LARGURA_MAX_IMAGEM,
    altura: Math.max(1, Math.round((altura * LARGURA_MAX_IMAGEM) / largura)),
  };
}

export function montarRascunho(dados: BannerDados): BannerDados {
  return {
    etiqueta: dados.etiqueta.trim(),
    titulo: dados.titulo.trim(),
    subtitulo: dados.subtitulo.trim(),
    cta1_texto: dados.cta1_texto.trim(),
    cta1_link: dados.cta1_link.trim(),
    cta2_texto: dados.cta2_texto.trim(),
    cta2_mostrar: dados.cta2_mostrar,
    imagem: dados.imagem,
  };
}

export function temAlteracoes(atual: BannerDados, base: BannerDados): boolean {
  return JSON.stringify(montarRascunho(atual)) !== JSON.stringify(montarRascunho(base));
}

const IMAGEM_PERMITIDA = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

export function validarRascunhoServidor(dados: unknown): string | null {
  if (!dados || typeof dados !== "object" || Array.isArray(dados)) return "Dados do banner inválidos.";
  const d = dados as Record<string, unknown>;
  const permitidas = [...CAMPOS_TEXTO, "cta2_mostrar", "imagem"] as string[];
  for (const chave of Object.keys(d)) {
    if (!permitidas.includes(chave)) return "Dados do banner inválidos.";
  }
  for (const campo of CAMPOS_TEXTO) {
    const v = d[campo];
    if (v === undefined || v === null) continue;
    if (typeof v !== "string") return "Dados do banner inválidos.";
    if (v.length > LIMITE_TEXTO_BANNER) {
      return `Texto muito longo (máximo ${LIMITE_TEXTO_BANNER} caracteres).`;
    }
  }
  if (d.cta2_mostrar !== undefined && typeof d.cta2_mostrar !== "boolean") return "Dados do banner inválidos.";
  if (typeof d.cta1_link === "string") {
    const erroLink = validarLinkBotao(d.cta1_link);
    if (erroLink) return erroLink;
  }
  const img = d.imagem;
  if (img !== undefined && img !== null) {
    if (typeof img !== "string" || img.length > LIMITE_DATA_URI) return validarDataUri(String(img)) ?? "Foto inválida.";
    if (!IMAGEM_PERMITIDA.test(img)) return "A foto deve ser JPG, PNG ou WebP.";
  }
  return null;
}

export type ErrosBanner = { titulo?: string; cta1_link?: string };

export function validarBanner(dados: BannerDados): ErrosBanner {
  const erros: ErrosBanner = {};
  if (dados.titulo.trim() === "" && !dados.imagem) erros.titulo = "Informe o título ou escolha uma foto.";
  const link = validarLinkBotao(dados.cta1_link);
  if (link) erros.cta1_link = link;
  return erros;
}
