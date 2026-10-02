import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { precoAtacado } from "@/lib/pricing";
import { selecionarLancamentos } from "@/lib/home";
import {
  descontoMedio,
  normalizarCarrinho,
  normalizarPedidos,
  type CarrinhoAtacado,
  type PedidoAtacado,
} from "@/lib/atacado";
import type { Product } from "@/lib/types";

export type CadastroRevendedor = {
  status: "pendente" | "aprovado" | "recusado";
  razao_social: string;
} | null;

export type CorCatalogo = {
  id: string;
  nome: string;
  hex: string | null;
  imagem: string | null;
  tamanhos: { id: string; tamanho: string; estoque: number }[];
};

export type ProdutoCatalogo = {
  id: string;
  nome: string;
  categoria: string;
  preco: number;
  cores: CorCatalogo[];
  created_at: string | null;
  ordem: number;
  ativo: boolean;
  colors: { sizes: { estoque: number }[] }[];
};

export function agora(): Date {
  return new Date();
}

export async function carregarCadastro(db: SupabaseClient): Promise<CadastroRevendedor> {
  const { data, error } = await db.rpc("atacado_me");
  if (error || !data || typeof data !== "object") return null;
  const r = data as { status?: unknown; razao_social?: unknown };
  if (r.status !== "pendente" && r.status !== "aprovado" && r.status !== "recusado") return null;
  return { status: r.status, razao_social: typeof r.razao_social === "string" ? r.razao_social : "" };
}

export async function carregarCarrinho(db: SupabaseClient): Promise<CarrinhoAtacado | null> {
  const { data, error } = await db.rpc("atacado_cart_get");
  if (error) return null;
  return normalizarCarrinho(data);
}

export async function carregarPedidos(db: SupabaseClient): Promise<PedidoAtacado[] | null> {
  const { data, error } = await db.rpc("atacado_my_orders");
  if (error) return null;
  return normalizarPedidos(data);
}

type LinhaProduto = Product & { created_at?: string | null };

export async function carregarCatalogo(
  db: SupabaseClient
): Promise<{ produtos: ProdutoCatalogo[]; descontoMedio: number | null } | null> {
  const { data, error } = await db
    .from("products")
    .select(
      "*, categoria:categorias(id, nome, desconto_atacado_percentual, ativo), colors:product_colors(id, nome, hex, imagens, ordem, sizes:product_sizes(id, tamanho, estoque))"
    )
    .eq("ativo", true)
    .order("ordem", { ascending: true })
    .order("nome", { ascending: true });
  if (error || !data) return null;

  const linhas = data as unknown as LinhaProduto[];
  const produtos = linhas.map<ProdutoCatalogo>((p) => {
    const cores = [...(p.colors ?? [])]
      .sort((a, b) => a.ordem - b.ordem)
      .map<CorCatalogo>((c) => ({
        id: c.id,
        nome: c.nome,
        hex: c.hex,
        imagem: c.imagens?.[0] ?? null,
        tamanhos: [...(c.sizes ?? [])].map((s) => ({
          id: s.id,
          tamanho: s.tamanho,
          estoque: Number(s.estoque),
        })),
      }));
    return {
      id: p.id,
      nome: p.nome,
      categoria: p.categoria?.nome ?? "",
      preco: precoAtacado(p, p.categoria),
      cores,
      created_at: p.created_at ?? null,
      ordem: p.ordem,
      ativo: p.ativo,
      colors: cores.map((c) => ({ sizes: c.tamanhos })),
    };
  });

  const categorias = new Map<string, number | null>();
  for (const p of linhas) {
    if (p.categoria && p.categoria.ativo) {
      categorias.set(p.categoria.id, p.categoria.desconto_atacado_percentual);
    }
  }
  return { produtos, descontoMedio: descontoMedio([...categorias.values()]) };
}

export function novidades(produtos: ProdutoCatalogo[]): ProdutoCatalogo[] {
  return selecionarLancamentos(produtos, 4);
}
