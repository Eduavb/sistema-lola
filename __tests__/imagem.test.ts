import { describe, it, expect } from "vitest";
import {
  CACHE_CONTROL_IMAGEM,
  etagDaImagem,
  hashCurtoImagem,
  idCategoriaValido,
  parseDataUriImagem,
  respostaImagem,
} from "@/lib/imagem";

const PNG = "data:image/png;base64,iVBORw0KGgo=";

describe("parseDataUriImagem", () => {
  it("decodifica tipos permitidos", () => {
    const r = parseDataUriImagem(PNG);
    expect(r?.tipo).toBe("image/png");
    expect(r?.bytes.length).toBe(8);
    for (const t of ["jpeg", "webp", "gif"]) {
      expect(parseDataUriImagem(`data:image/${t};base64,AAAA`)?.tipo).toBe(`image/${t}`);
    }
  });

  it("rejeita svg e outros tipos", () => {
    expect(parseDataUriImagem("data:image/svg+xml;base64,AAAA")).toBeNull();
    expect(parseDataUriImagem("data:image/bmp;base64,AAAA")).toBeNull();
    expect(parseDataUriImagem("data:text/html;base64,AAAA")).toBeNull();
  });

  it("rejeita data URI invalido, nao base64 e base64 corrompido", () => {
    expect(parseDataUriImagem("https://x.com/a.png")).toBeNull();
    expect(parseDataUriImagem("data:image/png,AAAA")).toBeNull();
    expect(parseDataUriImagem("data:image/png;base64,")).toBeNull();
    expect(parseDataUriImagem("data:image/png;base64,AA*A")).toBeNull();
    expect(parseDataUriImagem("data:image/png;base64,AAAAA")).toBeNull();
    expect(parseDataUriImagem(null)).toBeNull();
    expect(parseDataUriImagem(42)).toBeNull();
  });
});

describe("hash e etag", () => {
  it("hash curto estavel e sensivel ao conteudo", () => {
    expect(hashCurtoImagem(PNG)).toBe(hashCurtoImagem(PNG));
    expect(hashCurtoImagem(PNG)).not.toBe(hashCurtoImagem(PNG + "A"));
    expect(hashCurtoImagem(PNG)).toMatch(/^[0-9a-f]{12}$/);
  });

  it("etag entre aspas", () => {
    expect(etagDaImagem(PNG)).toMatch(/^"[0-9a-f]{32}"$/);
  });
});

describe("idCategoriaValido", () => {
  it("aceita so uuid", () => {
    expect(idCategoriaValido("123e4567-e89b-12d3-a456-426614174000")).toBe(true);
    expect(idCategoriaValido("../etc")).toBe(false);
    expect(idCategoriaValido("1")).toBe(false);
  });
});

describe("respostaImagem", () => {
  it("200 com cabecalhos de cache", async () => {
    const r = respostaImagem(PNG, null);
    expect(r.status).toBe(200);
    expect(r.headers.get("Content-Type")).toBe("image/png");
    expect(r.headers.get("Cache-Control")).toBe(CACHE_CONTROL_IMAGEM);
    expect(r.headers.get("ETag")).toBe(etagDaImagem(PNG));
    expect(r.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect((await r.arrayBuffer()).byteLength).toBe(8);
  });

  it("304 quando If-None-Match bate", () => {
    const r = respostaImagem(PNG, etagDaImagem(PNG));
    expect(r.status).toBe(304);
    expect(r.headers.get("ETag")).toBe(etagDaImagem(PNG));
  });

  it("404 para imagem ausente ou invalida", () => {
    expect(respostaImagem(null, null).status).toBe(404);
    expect(respostaImagem("data:image/svg+xml;base64,AAAA", null).status).toBe(404);
  });
});
