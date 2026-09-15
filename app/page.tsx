import { supabase } from "@/lib/supabase";
import { totalEstoque, type Product } from "@/lib/types";
import { BRAND } from "@/lib/brand.config";
import Header from "@/components/Header";
import HeroCarousel from "@/components/HeroCarousel";
import TrustStrip from "@/components/TrustStrip";
import ProductCard from "@/components/ProductCard";
import { PaymentsStrip, SiteFooter } from "@/components/PaymentsFooter";
import CategoryChips from "@/components/CategoryChips";
import BrandStory from "@/components/BrandStory";
import type { Categoria } from "@/lib/types";

export const revalidate = 0;

async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase()
    .from("products")
    .select(
      "*, categoria:categorias(*), colors:product_colors(*, sizes:product_sizes(*))"
    )
    .eq("ativo", true)
    .order("ordem", { ascending: true });

  if (error) {
    console.error(error);
    return [];
  }
  return (data ?? []) as unknown as Product[];
}

function EmptyGrid({ label }: { label: string }) {
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
      Nenhum {label} cadastrado ainda. Cadastre no{" "}
      <a href="/admin" style={{ color: "var(--ink-soft)", textDecoration: "underline" }}>
        painel
      </a>{" "}
      pra essa vitrine ganhar vida.
    </div>
  );
}

type CategoriaGroup = {
  key: string;
  nome: string;
  ordem: number;
  produtos: Product[];
};

// Agrupa uma lista de produtos por categoria, ordenando os grupos por
// categoria.ordem e depois pelo nome.
function agruparPorCategoria(produtos: Product[]): CategoriaGroup[] {
  const mapa = new Map<string, CategoriaGroup>();
  for (const p of produtos) {
    const cat = p.categoria ?? null;
    const key = cat?.id ?? "sem-categoria";
    if (!mapa.has(key)) {
      mapa.set(key, {
        key,
        nome: cat?.nome ?? "Sem categoria",
        ordem: cat?.ordem ?? 9999,
        produtos: [],
      });
    }
    mapa.get(key)!.produtos.push(p);
  }
  const grupos = [...mapa.values()];
  for (const g of grupos) {
    g.produtos.sort(
      (a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR")
    );
  }
  return grupos.sort(
    (a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR")
  );
}

function GrupoSection({
  id,
  titulo,
  destaque,
  produtos,
  emptyLabel,
}: {
  id: string;
  titulo: string;
  destaque: string;
  produtos: Product[];
  emptyLabel: string;
}) {
  const grupos = agruparPorCategoria(produtos);
  const mostrarSubtitulos = grupos.length > 1 || grupos[0]?.key !== "sem-categoria";

  return (
    <section className="section" id={id}>
      <div className="wrap">
        <div className="section-head" style={{ marginBottom: 40 }}>
          <span className="eyebrow-mono">{destaque}</span>
          <h2 className="section-title-new">{titulo}</h2>
        </div>
        {grupos.length === 0 ? (
          <EmptyGrid label={emptyLabel} />
        ) : (
          grupos.map((g) => (
            <div key={g.key} style={{ marginBottom: 40 }}>
              {mostrarSubtitulos && (
                <h3
                  style={{
                    fontFamily: "var(--font-serif)",
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

export default async function Home() {
  const todosAtivos = await getProducts();
  // Produto sem estoque em nenhuma cor/tamanho fica fora da vitrine
  // automaticamente — continua existindo no admin, só não aparece pro cliente.
  const products = todosAtivos.filter((p) => totalEstoque(p) > 0);

  const calcados = products.filter((p) => p.categoria?.grupo === "calcados");
  const acessorios = products.filter((p) => p.categoria?.grupo === "acessorios");
  const destaques = products.filter((p) => p.destaque).slice(0, 4);

  const categoriasVisiveis: Categoria[] = [
    ...new Map(
      products
        .filter((p) => p.categoria)
        .map((p) => [p.categoria!.id, p.categoria!] as const)
    ).values(),
  ].sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR"));

  return (
    <>
      <Header />

      <HeroCarousel
        slides={[
          { src: null, placeholderLabel: `Banner ${BRAND.nome}`, alt: BRAND.nome },
          {
            src: null,
            placeholderLabel: BRAND.tagline,
            alt: `${BRAND.nome} — ${BRAND.tagline}`,
          },
          {
            src: null,
            placeholderLabel: "Novidades em breve",
            alt: `${BRAND.nome} — novidades em breve`,
          },
        ]}
      />

      <TrustStrip />

      <CategoryChips categorias={categoriasVisiveis} />

      <section className="section" id="destaques">
        <div className="wrap">
          <div className="section-head" style={{ marginBottom: 40 }}>
            <span className="eyebrow-mono">da loja</span>
            <h2 className="section-title-new">Destaques</h2>
          </div>
          {destaques.length ? (
            <div className="prod-grid">
              {destaques.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <EmptyGrid label="produto em destaque" />
          )}
        </div>
      </section>

      <GrupoSection
        id="calcados"
        titulo="Calçados"
        destaque={BRAND.nome}
        produtos={calcados}
        emptyLabel="calçado"
      />

      <GrupoSection
        id="acessorios"
        titulo="Acessórios"
        destaque={BRAND.nome}
        produtos={acessorios}
        emptyLabel="acessório"
      />

      <BrandStory />

      <PaymentsStrip />
      <SiteFooter />
    </>
  );
}
