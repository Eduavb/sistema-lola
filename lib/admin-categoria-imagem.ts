export const LIMITE_IMAGEM_CATEGORIA = 1_500_000;
export const LARGURA_MAX_CATEGORIA = 800;
export const QUALIDADE_JPEG_CATEGORIA = 0.82;
export const LIMITE_ARQUIVO_CATEGORIA = 15 * 1024 * 1024;

const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp"];
const DATA_URI_PERMITIDA = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

export const MSG_IMAGEM_PESADA =
  "A imagem ficou muito pesada mesmo depois de reduzida. Escolha uma imagem mais simples ou menor.";

export function validarTipoImagemCategoria(tipo: string): string | null {
  return TIPOS_ACEITOS.includes(tipo) ? null : "Use uma imagem JPG, PNG ou WebP.";
}

export function dimensoesCategoria(largura: number, altura: number): { largura: number; altura: number } {
  if (largura <= LARGURA_MAX_CATEGORIA) return { largura, altura };
  return {
    largura: LARGURA_MAX_CATEGORIA,
    altura: Math.max(1, Math.round((altura * LARGURA_MAX_CATEGORIA) / largura)),
  };
}

/** Mesma regra no navegador (depois de reduzir) e no servidor Next (antes da RPC). */
export function validarImagemCategoria(valor: unknown): string | null {
  if (valor === null || valor === undefined || valor === "") return null;
  if (typeof valor !== "string") return "Imagem da categoria inválida.";
  if (valor.length > LIMITE_IMAGEM_CATEGORIA) return MSG_IMAGEM_PESADA;
  if (!DATA_URI_PERMITIDA.test(valor)) return "A imagem deve ser JPG, PNG ou WebP.";
  return null;
}
