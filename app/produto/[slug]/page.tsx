import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Product } from "@/lib/types";
import { BRAND } from "@/lib/brand.config";
import Header from "@/components/Header";
import ProductDetail from "@/components/ProductDetail";
import { PaymentsStrip, SiteFooter } from "@/components/PaymentsFooter";

export const revalidate = 0;

async function getProduct(slug: string): Promise<Product | null> {
  const { data, error } = await supabase()
    .from("products")
    .select(
      "*, categoria:categorias(*), colors:product_colors(*, sizes:product_sizes(*))"
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
  const product = await getProduct(slug);
  if (!product) notFound();

  return (
    <>
      <Header />
      <section className="section">
        <div className="wrap">
          <ProductDetail product={product} />
        </div>
      </section>
      <PaymentsStrip />
      <SiteFooter />
    </>
  );
}
