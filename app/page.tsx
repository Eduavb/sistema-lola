import { supabase } from "@/lib/supabase";
import { comDescontoEfetivo } from "@/lib/pricing";
import { getPromocoesAtivas } from "@/lib/promocoes";
import { getTextos } from "@/lib/textos";
import { totalEstoque, type Product } from "@/lib/types";
import { BANNER_PADRAO, normalizarBanner, paraCartaoLancamento, selecionarLancamentos } from "@/lib/home";
import { hashCurtoImagem, parseDataUriImagem } from "@/lib/imagem";
import { BRAND } from "@/lib/brand.config";
import SiteHeader from "@/components/SiteHeader";
import SiteFooterServer from "@/components/SiteFooterServer";
import { PaymentsStrip } from "@/components/PaymentsFooter";
import Hero from "@/components/home/Hero";
import Categorias, { type CategoriaVitrine } from "@/components/home/Categorias";
import Lancamentos from "@/components/home/Lancamentos";
import BannerRevendedora from "@/components/home/BannerRevendedora";
import GrupoSection from "@/components/home/GrupoSection";

export const revalidate = 0;

async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase()
    .from("products")
    .select(
      "*, categoria:categorias(id, nome, slug, ordem, grupo, desconto_atacado_percentual, ativo), colors:product_colors(*, sizes:product_sizes(*))"
    )
    .eq("ativo", true)
    .order("ordem", { ascending: true });

  if (error) {
    console.error(error);
    return [];
  }
  return (data ?? []) as unknown as Product[];
}

async function getBanner() {
  try {
    const { data, error } = await supabase().rpc("get_banner_hero");
    if (error) return { banner: BANNER_PADRAO, imagemSrc: null };
    const banner = normalizarBanner(data);
    const imagemSrc =
      banner.imagem && parseDataUriImagem(banner.imagem)
        ? `/api/banner-img?v=${hashCurtoImagem(banner.imagem)}`
        : null;
    return { banner: { ...banner, imagem: null }, imagemSrc };
  } catch {
    return { banner: BANNER_PADRAO, imagemSrc: null };
  }
}

type CategoriaLinha = CategoriaVitrine & { ordem: number };

// O base64 da imagem fica só no servidor: a página guarda apenas a URL da rota
// com cache (/api/categoria-img) e um hash curto que invalida quando a imagem muda.
async function getCategoriasAtivas(): Promise<CategoriaLinha[]> {
  const { data, error } = await supabase()
    .from("categorias")
    .select("id, nome, slug, ordem, imagem")
    .eq("ativo", true);
  if (error || !data) {
    if (error) console.error(error);
    return [];
  }
  return (data as (Omit<CategoriaLinha, "imagem"> & { imagem: string | null })[]).map((c) => ({
    id: c.id,
    nome: c.nome,
    slug: c.slug,
    ordem: c.ordem,
    imagem:
      c.imagem && parseDataUriImagem(c.imagem)
        ? `/api/categoria-img/${c.id}?v=${hashCurtoImagem(c.imagem)}`
        : null,
  }));
}

function categoriasVitrine(ativas: CategoriaLinha[], produtos: Product[]): CategoriaVitrine[] {
  const comEstoque = new Set(produtos.map((p) => p.categoria?.id));
  return ativas
    .filter((c) => comEstoque.has(c.id))
    .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR"))
    .map(({ id, nome, slug, imagem }) => ({ id, nome, slug, imagem }));
}

export default async function Home() {
  const [produtosBase, promos, textos, { banner, imagemSrc }, categoriasAtivas] =
    await Promise.all([
      getProducts(),
      getPromocoesAtivas(),
      getTextos(),
      getBanner(),
      getCategoriasAtivas(),
    ]);
  const todosAtivos = comDescontoEfetivo(produtosBase, promos);
  // Produto sem estoque em nenhuma cor/tamanho fica fora da vitrine
  // automaticamente — continua existindo no admin, só não aparece pro cliente.
  const products = todosAtivos.filter((p) => totalEstoque(p) > 0);

  const calcados = products.filter((p) => p.categoria?.grupo === "calcados");
  const acessorios = products.filter((p) => p.categoria?.grupo === "acessorios");

  const categorias = categoriasVitrine(categoriasAtivas, products);
  const lancamentos = selecionarLancamentos(products).map(paraCartaoLancamento);

  return (
    <>
      <SiteHeader />

      <Hero banner={banner} imagemSrc={imagemSrc} />

      <Categorias
        categorias={categorias}
        titulo={textos["home.categorias_titulo"]}
        etiqueta={textos["home.categorias_etiqueta"]}
      />

      <Lancamentos
        produtos={lancamentos}
        etiqueta={textos["home.lancamentos_etiqueta"]}
        titulo={textos["home.lancamentos_titulo"]}
      />

      <BannerRevendedora textos={textos} />

      <section className="home-secao home-todos" id="todos-os-produtos">
        <div className="home-secao-cab">
          <h2 className="home-titulo">Todos os produtos</h2>
        </div>
      </section>

      <GrupoSection
        id="calcados"
        titulo="Calçados"
        destaque={BRAND.nome}
        produtos={calcados}
      />

      <GrupoSection
        id="acessorios"
        titulo="Acessórios"
        destaque={BRAND.nome}
        produtos={acessorios}
      />

      <PaymentsStrip />
      <SiteFooterServer />
    </>
  );
}
