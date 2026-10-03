import { createHash } from "node:crypto";

export const CACHE_CONTROL_IMAGEM = "public, max-age=300, stale-while-revalidate=86400";

const TIPOS_PERMITIDOS = ["jpeg", "png", "webp", "gif"];
const DATA_URI = /^data:image\/([a-z0-9]+);base64,([A-Za-z0-9+/]+={0,2})$/;

export function parseDataUriImagem(valor: unknown): { tipo: string; bytes: Buffer } | null {
  if (typeof valor !== "string") return null;
  const m = DATA_URI.exec(valor);
  if (!m || !TIPOS_PERMITIDOS.includes(m[1]) || m[2].length % 4 !== 0) return null;
  const bytes = Buffer.from(m[2], "base64");
  if (bytes.length === 0) return null;
  return { tipo: `image/${m[1]}`, bytes };
}

function sha256(valor: string): string {
  return createHash("sha256").update(valor).digest("hex");
}

export function hashCurtoImagem(dataUri: string): string {
  return sha256(dataUri).slice(0, 12);
}

export function etagDaImagem(dataUri: string): string {
  return `"${sha256(dataUri).slice(0, 32)}"`;
}

export function idCategoriaValido(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export function respostaImagem(dataUri: unknown, ifNoneMatch: string | null): Response {
  const img = parseDataUriImagem(dataUri);
  if (!img || typeof dataUri !== "string") return new Response(null, { status: 404 });
  const etag = etagDaImagem(dataUri);
  const cabecalhos = {
    ETag: etag,
    "Cache-Control": CACHE_CONTROL_IMAGEM,
    "X-Content-Type-Options": "nosniff",
  };
  if (ifNoneMatch && ifNoneMatch.split(",").some((e) => e.trim() === etag)) {
    return new Response(null, { status: 304, headers: cabecalhos });
  }
  return new Response(new Uint8Array(img.bytes), {
    status: 200,
    headers: { ...cabecalhos, "Content-Type": img.tipo },
  });
}
