import { describe, it, expect } from "vitest";
import {
  BANNER_PADRAO,
  COR_BLOCO_CATEGORIA,
  corBlocoCategoria,
  ctaLinkSeguro,
  normalizarBanner,
  paraCartaoLancamento,
  selecionarLancamentos,
  textoParcela3x,
  type ProdutoLancamento,
} from "@/lib/home";

function prod(id: string, extra: Partial<ProdutoLancamento> = {}): ProdutoLancamento {
  return {
    id,
    nome: `Produto ${id}`,
    ordem: 0,
    ativo: true,
    created_at: "2026-09-01T10:00:00Z",
    colors: [{ sizes: [{ estoque: 3 }] }],
    ...extra,
  };
}

describe("selecionarLancamentos", () => {
  it("ordena por created_at desc", () => {
    const r = selecionarLancamentos([
      prod("a", { created_at: "2026-09-01T00:00:00Z" }),
      prod("b", { created_at: "2026-09-03T00:00:00Z" }),
      prod("c", { created_at: "2026-09-02T00:00:00Z" }),
    ]);
    expect(r.map((p) => p.id)).toEqual(["b", "c", "a"]);
  });

  it("desempata por ordem asc e depois por nome", () => {
    const r = selecionarLancamentos([
      prod("a", { ordem: 2, nome: "Zeta" }),
      prod("b", { ordem: 1, nome: "Beta" }),
      prod("c", { ordem: 1, nome: "Alfa" }),
    ]);
    expect(r.map((p) => p.id)).toEqual(["c", "b", "a"]);
  });

  it("descarta inativos e sem estoque", () => {
    const r = selecionarLancamentos([
      prod("a", { ativo: false }),
      prod("b", { colors: [{ sizes: [{ estoque: 0 }] }] }),
      prod("c", { colors: [] }),
      prod("d"),
    ]);
    expect(r.map((p) => p.id)).toEqual(["d"]);
  });

  it("limita a 8 e não altera a entrada", () => {
    const lista = Array.from({ length: 12 }, (_, i) => prod(String(i), { ordem: i }));
    const copia = [...lista];
    expect(selecionarLancamentos(lista)).toHaveLength(8);
    expect(selecionarLancamentos(lista, 3)).toHaveLength(3);
    expect(lista).toEqual(copia);
  });

  it("created_at ausente vai para o fim", () => {
    const r = selecionarLancamentos([
      prod("a", { created_at: null }),
      prod("b", { created_at: "2026-01-01T00:00:00Z" }),
    ]);
    expect(r.map((p) => p.id)).toEqual(["b", "a"]);
  });
});

describe("corBlocoCategoria", () => {
  it("cicla pelas cinco cores do design", () => {
    expect(COR_BLOCO_CATEGORIA).toEqual(["#FFE4EC", "#DDF7EE", "#EFE0DB", "#EEE5FF", "#FFEBDA"]);
    expect(corBlocoCategoria(0)).toBe("#FFE4EC");
    expect(corBlocoCategoria(4)).toBe("#FFEBDA");
    expect(corBlocoCategoria(5)).toBe("#FFE4EC");
    expect(corBlocoCategoria(7)).toBe("#EFE0DB");
  });
});

describe("ctaLinkSeguro", () => {
  it("aceita caminho, âncora e https", () => {
    expect(ctaLinkSeguro("/produto/x")).toBe("/produto/x");
    expect(ctaLinkSeguro("#categorias")).toBe("#categorias");
    expect(ctaLinkSeguro("https://lola.com.br/a")).toBe("https://lola.com.br/a");
  });

  it("recusa esquemas perigosos, // e vazio", () => {
    for (const ruim of [
      "javascript:alert(1)",
      "data:text/html,x",
      "//evil.com",
      "http://evil.com",
      "evil.com",
      "",
      "   ",
      "/\\evil.com",
      "/\tevil.com",
      null,
      undefined,
      42,
    ]) {
      expect(ctaLinkSeguro(ruim)).toBe("#lancamentos");
    }
  });

  it("usa o fallback informado", () => {
    expect(ctaLinkSeguro("javascript:x", "#categorias")).toBe("#categorias");
  });
});

describe("normalizarBanner", () => {
  it("sem dados devolve o padrão do seed", () => {
    expect(normalizarBanner(null)).toEqual(BANNER_PADRAO);
    expect(normalizarBanner("x")).toEqual(BANNER_PADRAO);
    expect(BANNER_PADRAO).toMatchObject({
      etiqueta: "COLEÇÃO VERÃO 26",
      titulo: "Pisa confiante.",
      cta1_texto: "Ver coleção",
      cta1_link: "#lancamentos",
      cta2_texto: "Comprar por categoria",
      cta2_mostrar: true,
      imagem: null,
    });
  });

  it("campos vazios caem no padrão e o link é validado", () => {
    const r = normalizarBanner({
      titulo: "Novo",
      subtitulo: "  ",
      cta1_link: "javascript:alert(1)",
      cta2_mostrar: false,
      imagem: "data:image/png;base64,AAA",
    });
    expect(r.titulo).toBe("Novo");
    expect(r.subtitulo).toBe(BANNER_PADRAO.subtitulo);
    expect(r.cta1_link).toBe("#lancamentos");
    expect(r.cta2_mostrar).toBe(false);
    expect(r.imagem).toBe("data:image/png;base64,AAA");
  });

  it("imagem que não é data URL de imagem é descartada", () => {
    expect(normalizarBanner({ imagem: "https://x.com/a.png" }).imagem).toBeNull();
    expect(normalizarBanner({ imagem: "data:text/html;base64,AAA" }).imagem).toBeNull();
  });
});

describe("paraCartaoLancamento", () => {
  const base = {
    id: "1",
    slug: "tenis",
    nome: "Tênis",
    preco: 200,
    categoria: { nome: "Tênis" },
    colors: [
      { nome: "Rosa", hex: "#FF8FAB", imagens: ["data:a", "data:b"] },
      { nome: "Sem hex", hex: null, imagens: [] },
    ],
  };

  it("usa a primeira imagem da primeira cor e as cores reais", () => {
    const c = paraCartaoLancamento(base);
    expect(c.imagem).toBe("data:a");
    expect(c.cores).toEqual([
      { nome: "Rosa", hex: "#FF8FAB" },
      { nome: "Sem hex", hex: "#CCCCCC" },
    ]);
    expect(c.preco).toBe(200);
    expect(c.precoOriginal).toBeNull();
  });

  it("aplica o desconto efetivo e guarda o preço original", () => {
    const c = paraCartaoLancamento({ ...base, desconto_efetivo: 25 });
    expect(c.preco).toBe(150);
    expect(c.precoOriginal).toBe(200);
  });

  it("sem cores nem categoria", () => {
    const c = paraCartaoLancamento({ ...base, colors: [], categoria: null });
    expect(c.imagem).toBeNull();
    expect(c.categoria).toBe("");
  });
});

describe("textoParcela3x", () => {
  it("formata preço/3 em reais", () => {
    expect(textoParcela3x(299).replace(/ /g, " ")).toBe("ou 3x R$ 99,67");
    expect(textoParcela3x(189).replace(/ /g, " ")).toBe("ou 3x R$ 63,00");
  });
});
