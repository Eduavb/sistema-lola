import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { comDescontoEfetivo } from "@/lib/pricing";
import { getPromocoesAtivas } from "@/lib/promocoes";
import type { Product } from "@/lib/types";
import { BRAND } from "@/lib/brand.config";
import { DEMO, PRODUTOS_DEMO } from "@/lib/demo-catalogo";
import SiteHeader from "@/components/SiteHeader";
import SiteFooterServer from "@/components/SiteFooterServer";
import ProductDetail from "@/components/ProductDetail";
import { PaymentsStrip } from "@/components/PaymentsFooter";

export const revalidate = 0;

async function getProduct(slug: string): Promise<Product | null> {
  if (DEMO) return PRODUTOS_DEMO.find((p) => p.slug === slug) ?? null;
  const { data, error } = await supabase()
    .from("products")
    .select(
      "*, categoria:categorias(id, nome, slug, ordem, grupo, desconto_atacado_percentual, ativo), colors:product_colors(*, sizes:product_sizes(*))"
    )
    .eq("slug", slug)
    .eq("ativo", true)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as Product;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) {
    return { title: `Produto não encontrado — ${BRAND.nome}` };
  }
  return {
    title: `${product.nome} — ${BRAND.nome}`,
    description: product.descricao ?? undefined,
  };
}

export default async function ProdutoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const base = await getProduct(slug);
  if (!base) notFound();
  const [product] = comDescontoEfetivo([base], await getPromocoesAtivas());

  return (
    <>
      <SiteHeader />
      <section className="section">
        <div className="wrap">
          <ProductDetail product={product} />
        </div>
      </section>
      <PaymentsStrip />
      <SiteFooterServer />
    </>
  );
}
