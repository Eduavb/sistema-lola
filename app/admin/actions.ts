"use server";

import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";
import type { Product, Categoria, Order, Sale, OrderStatus } from "@/lib/types";

const COOKIE_NAME = "lola_admin_secret";

const COOKIE_OPTS = {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
} as const;

async function getSecret(): Promise<string | null> {
  return (await cookies()).get(COOKIE_NAME)?.value ?? null;
}

export async function isLoggedIn(): Promise<boolean> {
  return (await getSecret()) !== null;
}

export async function loginAdmin(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const senha = String(formData.get("senha") || "");
  const { error } = await supabase().rpc("admin_list_categorias", {
    p_secret: senha,
  });
  if (error) {
    return { error: "Senha incorreta." };
  }
  (await cookies()).set(COOKIE_NAME, senha, COOKIE_OPTS);
  return {};
}

export async function logoutAdmin(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}

export async function changePassword(
  oldSenha: string,
  newSenha: string
): Promise<{ error?: string }> {
  const { error } = await supabase().rpc("admin_set_secret", {
    p_old_secret: oldSenha,
    p_new_secret: newSenha,
  });
  if (error) {
    return { error: "Senha atual incorreta ou nova senha inválida." };
  }
  (await cookies()).set(COOKIE_NAME, newSenha, COOKIE_OPTS);
  return {};
}

export async function fetchProducts(): Promise<Product[]> {
  const secret = await getSecret();
  if (!secret) return [];
  const { data, error } = await supabase().rpc("admin_list_products", {
    p_secret: secret,
  });
  if (error) return [];
  return (data ?? []) as Product[];
}

export async function fetchCategorias(): Promise<Categoria[]> {
  const secret = await getSecret();
  if (!secret) return [];
  const { data, error } = await supabase().rpc("admin_list_categorias", {
    p_secret: secret,
  });
  if (error) return [];
  return (data ?? []) as Categoria[];
}

export async function fetchOrders(p_filtro: string = "todos"): Promise<Order[]> {
  const secret = await getSecret();
  if (!secret) return [];
  const { data, error } = await supabase().rpc("admin_list_orders", {
    p_secret: secret,
    p_filtro,
  });
  if (error) return [];
  return (data ?? []) as Order[];
}

export async function fetchSales(p_filtro: string = "todos"): Promise<Sale[]> {
  const secret = await getSecret();
  if (!secret) return [];
  const { data, error } = await supabase().rpc("admin_list_sales", {
    p_secret: secret,
    p_filtro,
  });
  if (error) return [];
  return (data ?? []) as Sale[];
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
  const secret = await getSecret();
  if (!secret) return { error: "Não autenticado." };
  const { data, error } = await supabase().rpc("admin_upsert_product", {
    p_secret: secret,
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
  const secret = await getSecret();
  if (!secret) return { error: "Não autenticado." };
  const { error } = await supabase().rpc("admin_delete_product", {
    p_secret: secret,
    p_id: id,
  });
  if (error) return { error: error.message };
  return {};
}

export async function setAtivo(id: string, ativo: boolean): Promise<{ error?: string }> {
  const secret = await getSecret();
  if (!secret) return { error: "Não autenticado." };
  const { error } = await supabase().rpc("admin_set_ativo", {
    p_secret: secret,
    p_id: id,
    p_ativo: ativo,
  });
  if (error) return { error: error.message };
  return {};
}

// Desconto de varejo rápido — passar null remove o desconto.
export async function setDesconto(
  id: string,
  pct: number | null
): Promise<{ error?: string }> {
  const secret = await getSecret();
  if (!secret) return { error: "Não autenticado." };
  const { error } = await supabase().rpc("admin_set_desconto", {
    p_secret: secret,
    p_id: id,
    p_desconto_percentual: pct,
  });
  if (error) return { error: error.message };
  return {};
}

// Ativar um produto na Live Surpresa desativa os demais no servidor.
export async function setSurpresa(id: string, ativo: boolean): Promise<{ error?: string }> {
  const secret = await getSecret();
  if (!secret) return { error: "Não autenticado." };
  const { error } = await supabase().rpc("admin_set_surpresa", {
    p_secret: secret,
    p_id: id,
    p_ativo: ativo,
  });
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
  const secret = await getSecret();
  if (!secret) return { error: "Não autenticado." };
  const { data, error } = await supabase().rpc("admin_upsert_color", {
    p_secret: secret,
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
  const secret = await getSecret();
  if (!secret) return { error: "Não autenticado." };
  const { error } = await supabase().rpc("admin_delete_color", {
    p_secret: secret,
    p_id: id,
  });
  if (error) return { error: error.message };
  return {};
}

export async function saveSize(payload: {
  id: string | null;
  color_id: string;
  tamanho: string;
  estoque: number;
}): Promise<{ error?: string; id?: string }> {
  const secret = await getSecret();
  if (!secret) return { error: "Não autenticado." };
  const { data, error } = await supabase().rpc("admin_upsert_size", {
    p_secret: secret,
    p_id: payload.id,
    p_color_id: payload.color_id,
    p_tamanho: payload.tamanho,
    p_estoque: payload.estoque,
  });
  if (error) return { error: error.message };
  return { id: data as string };
}

export async function deleteSize(id: string): Promise<{ error?: string }> {
  const secret = await getSecret();
  if (!secret) return { error: "Não autenticado." };
  const { error } = await supabase().rpc("admin_delete_size", {
    p_secret: secret,
    p_id: id,
  });
  if (error) return { error: error.message };
  return {};
}

// --- Categorias (mutations) ----------------------------------------------

export async function saveCategoria(payload: {
  id: string | null;
  grupo: "calcados" | "acessorios";
  nome: string;
  slug: string;
  ordem: number;
  ativo: boolean;
  desconto_atacado_percentual: number | null;
}): Promise<{ error?: string; id?: string }> {
  const secret = await getSecret();
  if (!secret) return { error: "Não autenticado." };
  const { data, error } = await supabase().rpc("admin_upsert_categoria", {
    p_secret: secret,
    p_id: payload.id,
    p_grupo: payload.grupo,
    p_nome: payload.nome,
    p_slug: payload.slug,
    p_ordem: payload.ordem,
    p_ativo: payload.ativo,
    p_desconto_atacado_percentual: payload.desconto_atacado_percentual,
  });
  if (error) return { error: error.message };
  return { id: data as string };
}

export async function deleteCategoria(id: string): Promise<{ error?: string }> {
  const secret = await getSecret();
  if (!secret) return { error: "Não autenticado." };
  const { error } = await supabase().rpc("admin_delete_categoria", {
    p_secret: secret,
    p_id: id,
  });
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
  const secret = await getSecret();
  if (!secret) return { error: "Não autenticado." };
  const { error } = await supabase().rpc("admin_update_order_status", {
    p_secret: secret,
    p_id: id,
    p_status: status,
  });
  if (error) return { error: error.message };
  return {};
}

// Liquidação manual de um pedido `pendente` quando o webhook não chegou:
// baixa estoque + grava `sales` via a RPC `admin_settle_order`.
export async function settleOrder(id: string): Promise<{ error?: string }> {
  const secret = await getSecret();
  if (!secret) return { error: "Não autenticado." };
  const { data, error } = await supabase().rpc("admin_settle_order", {
    p_secret: secret,
    p_order_id: id,
  });
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
  const secret = await getSecret();
  if (!secret) return { error: "Não autenticado." };
  const { error } = await supabase().rpc("admin_insert_sale", {
    p_secret: secret,
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
  const secret = await getSecret();
  if (!secret) return { error: "Não autenticado." };
  const { error } = await supabase().rpc("admin_delete_sale", {
    p_secret: secret,
    p_id: id,
  });
  if (error) return { error: error.message };
  return {};
}

export async function fetchConfig(): Promise<{
  taxa_entrega_local: number;
  whatsapp: string;
  cidade_taxa: string;
} | null> {
  const secret = await getSecret();
  if (!secret) return null;
  const { data, error } = await supabase().rpc("admin_get_config", {
    p_secret: secret,
  });
  if (error) return null;
  return (data as {
    taxa_entrega_local: number;
    whatsapp: string;
    cidade_taxa: string;
  }) ?? null;
}

export async function saveConfig(payload: {
  taxa_entrega_local: number;
  whatsapp: string;
  cidade_taxa: string;
}): Promise<{ error?: string }> {
  const secret = await getSecret();
  if (!secret) return { error: "Não autenticado." };
  const { error } = await supabase().rpc("admin_set_config", {
    p_secret: secret,
    p_taxa: payload.taxa_entrega_local,
    p_whatsapp: payload.whatsapp,
    p_cidade: payload.cidade_taxa,
  });
  if (error) return { error: error.message };
  return {};
}
