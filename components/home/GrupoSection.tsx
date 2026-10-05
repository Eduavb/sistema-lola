import type { Product } from "@/lib/types";
import ProductCard from "@/components/ProductCard";

function EmptyGrid() {
  return (
    <div
      style={{
        border: "1px dashed var(--line)",
        padding: "48px 24px",
        textAlign: "center",
        color: "var(--muted)",
        fontSize: 13,
      }}
    >
      Novidades chegando em breve.
    </div>
  );
}

type CategoriaGroup = {
  key: string;
  slug: string | null;
  nome: string;
  ordem: number;
  produtos: Product[];
};

function agruparPorCategoria(produtos: Product[]): CategoriaGroup[] {
  const mapa = new Map<string, CategoriaGroup>();
  for (const p of produtos) {
    const cat = p.categoria ?? null;
    const key = cat?.id ?? "sem-categoria";
    if (!mapa.has(key)) {
      mapa.set(key, {
        key,
        slug: cat?.slug ?? null,
        nome: cat?.nome ?? "Sem categoria",
        ordem: cat?.ordem ?? 9999,
        produtos: [],
      });
    }
    mapa.get(key)!.produtos.push(p);
  }
  const grupos = [...mapa.values()];
  for (const g of grupos) {
    g.produtos.sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR"));
  }
  return grupos.sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR"));
}

export default function GrupoSection({
  id,
  titulo,
  destaque,
  produtos,
}: {
  id: string;
  titulo: string;
  destaque: string;
  produtos: Product[];
}) {
  const grupos = agruparPorCategoria(produtos);
  const mostrarSubtitulos = grupos.length > 1 || grupos[0]?.key !== "sem-categoria";

  return (
    <section className="section home-ancora" id={id}>
      <div className="wrap">
        <div className="section-head" style={{ marginBottom: 40 }}>
          <span className="eyebrow-mono">{destaque}</span>
          <h2 className="section-title-new">{titulo}</h2>
        </div>
        {grupos.length === 0 ? (
          <EmptyGrid />
        ) : (
          grupos.map((g) => (
            <div
              key={g.key}
              id={g.slug ? `cat-${g.slug}` : undefined}
              className="home-ancora"
              style={{ marginBottom: 40 }}
            >
              {mostrarSubtitulos && (
                <h3
                  style={{
                    fontFamily: "var(--font-display), sans-serif",
                    fontSize: 20,
                    color: "var(--ink-soft)",
                    marginBottom: 20,
                  }}
                >
                  {g.nome}
                </h3>
              )}
              <div className="prod-grid">
                {g.produtos.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
