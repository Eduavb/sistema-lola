"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { apagarSessao, encerrarNoSupabase, getSessao, perfilPorToken } from "@/lib/auth";
import { supabaseComToken } from "@/lib/supabase";
import { MSG_PERFIL_INDISPONIVEL, decidirAcesso, type AcaoAdmin } from "@/lib/admin-acesso";
import type {
  Product,
  Categoria,
  Order,
  Sale,
  OrderStatus,
  Revendedor,
  RevendedorStatus,
  EstoqueBaixoItem,
} from "@/lib/types";
import { mesclarTextos } from "@/lib/textos";
import { validarValoresServidor } from "@/lib/admin-textos";
import {
  montarRascunho,
  normalizarServidor,
  validarRascunhoServidor,
  type BannerDados,
  type BannerServidor,
} from "@/lib/admin-banner";
import {
  lerConfig,
  listarCategorias,
  listarEstoqueBaixo,
  listarPedidos,
  listarProdutos,
  listarRevendedores,
  listarVendas,
  type ConfigAdmin,
} from "./consultas";

export type { Revendedor } from "@/lib/types";

const SEM_SESSAO = "Sessão expirada. Entre de novo.";

type Guarda = { sb: SupabaseClient } | { error: string };

async function autorizar(acao: AcaoAdmin): Promise<Guarda> {
  try {
    const sessao = await getSessao({ renovar: true });
    if (!sessao) return { error: SEM_SESSAO };
    const decisao = decidirAcesso(await perfilPorToken(sessao.accessToken), acao);
    if (decisao.ok) return { sb: supabaseComToken(sessao.accessToken) };
    if (decisao.encerrarSessao) {
      await encerrarNoSupabase(sessao.accessToken);
      await apagarSessao();
    }
    return { error: decisao.error };
  } catch {
    return { error: MSG_PERFIL_INDISPONIVEL };
  }
}

async function cliente(acao: AcaoAdmin): Promise<SupabaseClient | null> {
  const g = await autorizar(acao);
  return "sb" in g ? g.sb : null;
}

export async function fetchProducts(): Promise<Product[]> {
  const sb = await cliente("catalogo");
  return sb ? listarProdutos(sb) : [];
}

export async function fetchCategorias(): Promise<Categoria[]> {
  const sb = await cliente("catalogo");
  return sb ? listarCategorias(sb) : [];
}

export async function fetchOrders(p_filtro: string = "todos"): Promise<Order[]> {
  const sb = await cliente("pedidos");
  return sb ? listarPedidos(sb, p_filtro) : [];
}

export async function fetchSales(p_filtro: string = "todos"): Promise<Sale[]> {
  const sb = await cliente("vendas-leitura");
  return sb ? listarVendas(sb, p_filtro) : [];
}

export async function fetchEstoqueBaixo(): Promise<EstoqueBaixoItem[]> {
  const sb = await cliente("estoque-baixo");
  return sb ? listarEstoqueBaixo(sb) : [];
}

// --- Produtos / cores / tamanhos (mutations) -------------------------------

export async function saveProduct(payload: {
  id: string | null;
  nome: string;
  categoria_id: string;
  colecao: string;
  preco: number;
  descricao: string;
  caracteristicas: string[];
  ativo: boolean;
  destaque: boolean;
  ordem: number;
  slug: string;
  desconto_percentual: number | null;
  preco_atacado: number | null;
}): Promise<{ error?: string; id?: string }> {
  const g = await autorizar("catalogo");
  if ("error" in g) return { error: g.error };
  const { data, error } = await g.sb.rpc("admin_upsert_product", {
    p_id: payload.id,
    p_nome: payload.nome,
    p_categoria_id: payload.categoria_id,
    p_colecao: payload.colecao || null,
    p_preco: payload.preco,
    p_desconto_percentual: payload.desconto_percentual,
    p_preco_atacado: payload.preco_atacado,
    p_descricao: payload.descricao,
    p_caracteristicas: payload.caracteristicas,
    p_ativo: payload.ativo,
    p_destaque: payload.destaque,
    p_ordem: payload.ordem,
    p_slug: payload.slug,
  });
  if (error) return { error: error.message };
  return { id: data as string };
}

export async function deleteProduct(id: string): Promise<{ error?: string }> {
  const g = await autorizar("catalogo");
  if ("error" in g) return { error: g.error };
  const { error } = await g.sb.rpc("admin_delete_product", { p_id: id });
  if (error) return { error: error.message };
  return {};
}

export async function setAtivo(id: string, ativo: boolean): Promise<{ error?: string }> {
  const g = await autorizar("catalogo");
  if ("error" in g) return { error: g.error };
  const { error } = await g.sb.rpc("admin_set_ativo", { p_id: id, p_ativo: ativo });
  if (error) return { error: error.message };
  return {};
}

// Desconto de varejo rápido — passar null remove o desconto.
export async function setDesconto(
  id: string,
  pct: number | null
): Promise<{ error?: string }> {
  const g = await autorizar("catalogo");
  if ("error" in g) return { error: g.error };
  const { error } = await g.sb.rpc("admin_set_desconto", {
    p_id: id,
    p_desconto_percentual: pct,
  });
  if (error) return { error: error.message };
  return {};
}

// Ativar um produto na Live Surpresa desativa os demais no servidor.
export async function setSurpresa(id: string, ativo: boolean): Promise<{ error?: string }> {
  const g = await autorizar("catalogo");
  if ("error" in g) return { error: g.error };
  const { error } = await g.sb.rpc("admin_set_surpresa", { p_id: id, p_ativo: ativo });
  if (error) return { error: error.message };
  return {};
}

export async function setDestaque(
  id: string,
  destaque: boolean
): Promise<{ error?: string }> {
  const g = await autorizar("catalogo");
  if ("error" in g) return { error: g.error };
  const { error } = await g.sb.rpc("admin_set_destaque", { p_id: id, p_destaque: destaque });
  if (error) return { error: error.message };
  return {};
}

export async function saveColor(payload: {
  id: string | null;
  product_id: string;
  nome: string;
  hex: string;
  imagens: string[];
  ordem: number;
}): Promise<{ error?: string; id?: string }> {
  const g = await autorizar("catalogo");
  if ("error" in g) return { error: g.error };
  const { data, error } = await g.sb.rpc("admin_upsert_color", {
    p_id: payload.id,
    p_product_id: payload.product_id,
    p_nome: payload.nome,
    p_hex: payload.hex,
    p_imagens: payload.imagens,
    p_ordem: payload.ordem,
  });
  if (error) return { error: error.message };
  return { id: data as string };
}

export async function deleteColor(id: string): Promise<{ error?: string }> {
  const g = await autorizar("catalogo");
  if ("error" in g) return { error: g.error };
  const { error } = await g.sb.rpc("admin_delete_color", { p_id: id });
  if (error) return { error: error.message };
  return {};
}

export async function saveSize(payload: {
  id: string | null;
  color_id: string;
  tamanho: string;
  estoque: number;
}): Promise<{ error?: string; id?: string }> {
  const g = await autorizar("catalogo");
  if ("error" in g) return { error: g.error };
  const { data, error } = await g.sb.rpc("admin_upsert_size", {
    p_id: payload.id,
    p_color_id: payload.color_id,
    p_tamanho: payload.tamanho,
    p_estoque: payload.estoque,
  });
  if (error) return { error: error.message };
  return { id: data as string };
}

export async function deleteSize(id: string): Promise<{ error?: string }> {
  const g = await autorizar("catalogo");
  if ("error" in g) return { error: g.error };
  const { error } = await g.sb.rpc("admin_delete_size", { p_id: id });
  if (error) return { error: error.message };
  return {};
}

// --- Categorias (mutations) ----------------------------------------------

// admin_upsert_categoria grava a imagem como recebida (null apaga). Sem
// `imagem` no payload, reenvia a imagem atual em vez de apagá-la.
export async function saveCategoria(payload: {
  id: string | null;
  grupo: "calcados" | "acessorios";
  nome: string;
  slug: string;
  ordem: number;
  ativo: boolean;
  desconto_atacado_percentual: number | null;
  imagem?: string | null;
}): Promise<{ error?: string; id?: string }> {
  const g = await autorizar("catalogo");
  if ("error" in g) return { error: g.error };

  let imagem = payload.imagem ?? null;
  if (payload.imagem === undefined && payload.id) {
    const { data, error } = await g.sb
      .from("categorias")
      .select("imagem")
      .eq("id", payload.id)
      .maybeSingle();
    if (error) return { error: "Não foi possível ler a imagem atual da categoria." };
    imagem = (data as { imagem: string | null } | null)?.imagem ?? null;
  }

  const { data, error } = await g.sb.rpc("admin_upsert_categoria", {
    p_id: payload.id,
    p_grupo: payload.grupo,
    p_nome: payload.nome,
    p_slug: payload.slug,
    p_ordem: payload.ordem,
    p_ativo: payload.ativo,
    p_desconto_atacado_percentual: payload.desconto_atacado_percentual,
    p_imagem: imagem,
  });
  if (error) return { error: error.message };
  return { id: data as string };
}

export async function deleteCategoria(id: string): Promise<{ error?: string }> {
  const g = await autorizar("catalogo");
  if ("error" in g) return { error: g.error };
  const { error } = await g.sb.rpc("admin_delete_categoria", { p_id: id });
  if (error) {
    return {
      error: error.message.includes("produtos")
        ? "Essa categoria tem produtos — mova ou exclua os produtos antes."
        : error.message,
    };
  }
  return {};
}

// --- Pedidos / Vendas (mutations) --------------------------------------

export async function updateOrderStatus(
  id: string,
  status: OrderStatus
): Promise<{ error?: string }> {
  const g = await autorizar("pedidos");
  if ("error" in g) return { error: g.error };
  const { error } = await g.sb.rpc("admin_update_order_status", { p_id: id, p_status: status });
  if (error) return { error: error.message };
  return {};
}

// Liquidação manual de um pedido `pendente` quando o webhook não chegou:
// baixa estoque + grava `sales` via a RPC `admin_settle_order`.
export async function settleOrder(id: string): Promise<{ error?: string }> {
  const g = await autorizar("liquidar");
  if ("error" in g) return { error: g.error };
  const { data, error } = await g.sb.rpc("admin_settle_order", { p_order_id: id });
  if (error) return { error: error.message };
  const res = data as { ok?: boolean } | null;
  if (res && res.ok === false) return { error: "Não foi possível registrar o pagamento." };
  return {};
}

export async function insertSale(payload: {
  produto_id: string | null;
  produto_nome: string;
  quantidade: number;
  preco_unit: number;
  valor_total: number;
  forma_pagamento: string;
  cliente: string;
  produto_cor: string | null;
  produto_tamanho: string | null;
  size_id: string | null;
  is_atacado: boolean;
}): Promise<{ error?: string }> {
  const g = await autorizar("vendas-escrita");
  if ("error" in g) return { error: g.error };
  const { error } = await g.sb.rpc("admin_insert_sale", {
    p_produto_id: payload.produto_id,
    p_produto_nome: payload.produto_nome,
    p_quantidade: payload.quantidade,
    p_preco_unit: payload.preco_unit,
    p_valor_total: payload.valor_total,
    p_forma_pagamento: payload.forma_pagamento,
    p_cliente: payload.cliente || null,
    p_produto_cor: payload.produto_cor,
    p_produto_tamanho: payload.produto_tamanho,
    p_size_id: payload.size_id,
    p_is_atacado: payload.is_atacado,
  });
  if (error) return { error: error.message };
  return {};
}

export async function deleteSale(id: string): Promise<{ error?: string }> {
  const g = await autorizar("vendas-escrita");
  if ("error" in g) return { error: g.error };
  const { error } = await g.sb.rpc("admin_delete_sale", { p_id: id });
  if (error) return { error: error.message };
  return {};
}

// --- Config ------------------------------------------------------------------

export async function fetchConfig(): Promise<ConfigAdmin | null> {
  const sb = await cliente("config");
  return sb ? lerConfig(sb) : null;
}

export async function saveConfig(payload: ConfigAdmin): Promise<{ error?: string }> {
  const g = await autorizar("config");
  if ("error" in g) return { error: g.error };
  const { error } = await g.sb.rpc("admin_set_config", {
    p_taxa: payload.taxa_entrega_local,
    p_whatsapp: payload.whatsapp,
    p_cidade: payload.cidade_taxa,
  });
  if (error) return { error: error.message };
  return {};
}

// --- Revendedores ------------------------------------------------------------

export async function fetchRevendedores(p_status: string = "todos"): Promise<Revendedor[]> {
  const sb = await cliente("revendedores");
  return sb ? listarRevendedores(sb, p_status) : [];
}

export async function setRevendedorStatus(
  id: string,
  status: RevendedorStatus
): Promise<{ error?: string }> {
  const g = await autorizar("revendedores-status");
  if ("error" in g) return { error: g.error };
  const { error } = await g.sb.rpc("admin_set_revendedor_status", { p_id: id, p_status: status });
  if (error) return { error: error.message };
  return {};
}

export async function upsertRevendedor(payload: {
  id: string | null;
  razao_social: string;
  cnpj: string;
  responsavel: string;
  email: string;
  whatsapp: string;
  cidade: string;
  uf: string;
}): Promise<{ error?: string; id?: string }> {
  const g = await autorizar("revendedores");
  if ("error" in g) return { error: g.error };
  const { data, error } = await g.sb.rpc("admin_upsert_revendedor", {
    p_id: payload.id,
    p_razao_social: payload.razao_social,
    p_cnpj: payload.cnpj,
    p_responsavel: payload.responsavel,
    p_email: payload.email,
    p_whatsapp: payload.whatsapp,
    p_cidade: payload.cidade,
    p_uf: payload.uf,
  });
  if (error) return { error: error.message };
  return { id: data as string };
}

// --- Textos da loja e Banner do hero ----------------------------------------

type ResultadoRpc = { data?: unknown; error?: string };

async function chamarRpc(
  acao: AcaoAdmin,
  nome: string,
  args?: Record<string, unknown>
): Promise<ResultadoRpc> {
  try {
    const g = await autorizar(acao);
    if ("error" in g) return { error: g.error };
    const { data, error } = await g.sb.rpc(nome, args);
    if (error) return { error: error.message };
    return { data };
  } catch {
    return { error: "Não foi possível falar com o servidor agora. Tente de novo." };
  }
}

export async function fetchTextos(): Promise<{ valores?: Record<string, string>; error?: string }> {
  const r = await chamarRpc("textos", "get_textos");
  if (r.error) return { error: r.error };
  return { valores: mesclarTextos(r.data) };
}

export async function saveTextos(valores: Record<string, string>): Promise<{ error?: string }> {
  const invalido = validarValoresServidor(valores);
  if (invalido) return { error: invalido };
  const r = await chamarRpc("textos", "admin_set_textos", { p_valores: valores });
  return r.error ? { error: r.error } : {};
}

export async function fetchBanner(): Promise<{ banner?: BannerServidor; error?: string }> {
  const r = await chamarRpc("banner", "admin_get_banner_hero");
  if (r.error) return { error: r.error };
  const banner = normalizarServidor(r.data);
  return banner ? { banner } : { error: "Banner não encontrado." };
}

export async function saveBannerRascunho(dados: BannerDados): Promise<{ error?: string }> {
  const invalido = validarRascunhoServidor(dados);
  if (invalido) return { error: invalido };
  const r = await chamarRpc("banner", "admin_save_banner_rascunho", { p_dados: montarRascunho(dados) });
  return r.error ? { error: r.error } : {};
}

export async function publishBanner(): Promise<{ error?: string }> {
  const r = await chamarRpc("banner", "admin_publish_banner");
  return r.error ? { error: r.error } : {};
}

export async function discardBanner(): Promise<{ error?: string }> {
  const r = await chamarRpc("banner", "admin_discard_banner");
  return r.error ? { error: r.error } : {};
}
