import "server-only";

import { supabase } from "@/lib/supabase";
import { getPerfil } from "@/lib/auth";
import { getTextos, TEXTOS_PADRAO } from "@/lib/textos";
import { totalEstoque, type Product } from "@/lib/types";
import type { CategoriaNav, PerfilNav } from "@/lib/header-menu";

export type DadosHeader = {
  categorias: CategoriaNav[];
  perfil: PerfilNav | null;
  avisoTexto: string;
  avisoAtivo: string;
};

export type DadosRodape = {
  categorias: CategoriaNav[];
  textos: Record<string, string>;
};

export async function getCategoriasNav(): Promise<CategoriaNav[]> {
  try {
    const { data, error } = await supabase()
      .from("categorias")
      .select(
        "id, nome, slug, ordem, products!inner(id, colors:product_colors(sizes:product_sizes(estoque)))"
      )
      .eq("ativo", true)
      .eq("products.ativo", true);
    if (error || !data) return [];
    return (
      data as unknown as { nome: string; slug: string; ordem: number; products: unknown[] }[]
    )
      .filter((c) => c.products.some((p) => totalEstoque(p as Product) > 0))
      .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR"))
      .map((c) => ({ slug: c.slug, nome: c.nome }));
  } catch {
    return [];
  }
}

async function getPerfilNav(): Promise<PerfilNav | null> {
  try {
    const perfil = await getPerfil();
    if (!perfil || !perfil.ativo) return null;
    return { nome: perfil.nome, papel: perfil.papel };
  } catch {
    return null;
  }
}

export async function carregarDadosHeader(): Promise<DadosHeader> {
  const [categorias, perfil, textos] = await Promise.all([
    getCategoriasNav(),
    getPerfilNav(),
    getTextos().catch(() => TEXTOS_PADRAO),
  ]);
  return {
    categorias,
    perfil,
    avisoTexto: textos["aviso.texto"],
    avisoAtivo: textos["aviso.ativo"],
  };
}

export async function carregarDadosRodape(): Promise<DadosRodape> {
  const [categorias, textos] = await Promise.all([
    getCategoriasNav(),
    getTextos().catch(() => TEXTOS_PADRAO),
  ]);
  return { categorias, textos };
}
