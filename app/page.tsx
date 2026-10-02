import { supabase } from "@/lib/supabase";
import { comDescontoEfetivo } from "@/lib/pricing";
import { getPromocoesAtivas } from "@/lib/promocoes";
import { getTextos } from "@/lib/textos";
import { totalEstoque, type Product } from "@/lib/types";
import { BANNER_PADRAO, normalizarBanner, paraCartaoLancamento, selecionarLancamentos } from "@/lib/home";
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
    if (error) return BANNER_PADRAO;
    return normalizarBanner(data);
  } catch {
    return BANNER_PADRAO;
  }
}

async function getCategoriasVitrine(produtos: Product[]): Promise<CategoriaVitrine[]> {
  const comProduto = new Map<string, NonNullable<Product["categoria"]>>();
  for (const p of produtos) if (p.categoria) comProduto.set(p.categoria.id, p.categoria);
  if (comProduto.size === 0) return [];

  const ordenar = <T extends { ordem: number; nome: string }>(lista: T[]) =>
    lista.sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR"));

  const { data, error } = await supabase()
    .from("categorias")
    .select("id, nome, slug, ordem, imagem")
    .eq("ativo", true)
    .in("id", [...comProduto.keys()]);

  if (error || !data) {
    if (error) console.error(error);
    return ordenar([...comProduto.values()]).map((c) => ({
      id: c.id,
      nome: c.nome,
      slug: c.slug,
      imagem: null,
    }));
  }
  return ordenar(data as (CategoriaVitrine & { ordem: number })[]).map((c) => ({
    id: c.id,
    nome: c.nome,
    slug: c.slug,
    imagem: c.imagem ?? null,
  }));
}

export default async function Home() {
  const [produtosBase, promos, textos, banner] = await Promise.all([
    getProducts(),
    getPromocoesAtivas(),
    getTextos(),
    getBanner(),
  ]);
  const todosAtivos = comDescontoEfetivo(produtosBase, promos);
  // Produto sem estoque em nenhuma cor/tamanho fica fora da vitrine
  // automaticamente — continua existindo no admin, só não aparece pro cliente.
  const products = todosAtivos.filter((p) => totalEstoque(p) > 0);

  const calcados = products.filter((p) => p.categoria?.grupo === "calcados");
  const acessorios = products.filter((p) => p.categoria?.grupo === "acessorios");

  const categorias = await getCategoriasVitrine(products);
  const lancamentos = selecionarLancamentos(products).map(paraCartaoLancamento);

  return (
    <>
      <SiteHeader />

      <Hero banner={banner} />

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

      <PaymentsStrip />
      <SiteFooterServer />
    </>
  );
}
