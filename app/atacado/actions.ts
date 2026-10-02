"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { authedSupabase } from "@/lib/auth";
import {
  ehUuid,
  mensagemErroAtacado,
  normalizarCarrinho,
  proximaQuantidade,
  quantidadeValida,
} from "@/lib/atacado";

export type ResultadoAcao = { error: string | null };

const ERRO_ENTRADA = "Item inválido. Atualize a página e tente de novo.";
const ERRO_ESTOQUE = "Não há mais estoque disponível para esse item.";
const ERRO_ITEM_NAO_ENCONTRADO = "Esse item não está mais no seu carrinho.";

function ok(): ResultadoAcao {
  revalidatePath("/atacado", "layout");
  return { error: null };
}

function falha(mensagem: string): ResultadoAcao {
  return { error: mensagem };
}

async function lerCarrinho(db: SupabaseClient) {
  const { data, error } = await db.rpc("atacado_cart_get");
  if (error) return { error, carrinho: null };
  return { error: null, carrinho: normalizarCarrinho(data) };
}

export async function addAoCarrinho(
  productId: string,
  colorId: string,
  sizeId: string
): Promise<ResultadoAcao> {
  try {
    if (!ehUuid(productId) || !ehUuid(colorId) || !ehUuid(sizeId)) return falha(ERRO_ENTRADA);
    const db = await authedSupabase({ renovar: true });

    const lido = await lerCarrinho(db);
    if (lido.error) return falha(mensagemErroAtacado(lido.error));
    const linha = lido.carrinho.itens.find(
      (i) => i.product_id === productId && i.color_id === colorId && i.size_id === sizeId
    );

    let estoque = linha?.estoque;
    if (estoque === undefined) {
      const { data, error } = await db
        .from("product_sizes")
        .select("estoque")
        .eq("id", sizeId)
        .eq("color_id", colorId)
        .maybeSingle();
      if (error || !data) return falha(ERRO_ENTRADA);
      estoque = Number((data as { estoque: number }).estoque);
    }

    const quantidade = proximaQuantidade(linha?.quantidade ?? 0, estoque);
    if (quantidade === null) return falha(ERRO_ESTOQUE);

    const { error } = await db.rpc("atacado_cart_set_item", {
      p_product_id: productId,
      p_color_id: colorId,
      p_size_id: sizeId,
      p_quantidade: quantidade,
    });
    if (error) return falha(mensagemErroAtacado(error));
    return ok();
  } catch {
    return falha(mensagemErroAtacado(null));
  }
}

export async function alterarQuantidade(
  itemId: string,
  quantidade: number
): Promise<ResultadoAcao> {
  try {
    if (!ehUuid(itemId) || !quantidadeValida(quantidade)) return falha(ERRO_ENTRADA);
    const db = await authedSupabase({ renovar: true });

    const lido = await lerCarrinho(db);
    if (lido.error) return falha(mensagemErroAtacado(lido.error));
    const linha = lido.carrinho.itens.find((i) => i.id === itemId);
    if (!linha) return falha(ERRO_ITEM_NAO_ENCONTRADO);
    if (quantidade > linha.quantidade && quantidade > linha.estoque) return falha(ERRO_ESTOQUE);

    const { error } = await db.rpc("atacado_cart_set_item", {
      p_product_id: linha.product_id,
      p_color_id: linha.color_id,
      p_size_id: linha.size_id,
      p_quantidade: quantidade,
    });
    if (error) return falha(mensagemErroAtacado(error));
    return ok();
  } catch {
    return falha(mensagemErroAtacado(null));
  }
}

export async function removerItem(itemId: string): Promise<ResultadoAcao> {
  try {
    if (!ehUuid(itemId)) return falha(ERRO_ENTRADA);
    const db = await authedSupabase({ renovar: true });
    const { error } = await db.rpc("atacado_cart_remove_item", { p_id: itemId });
    if (error) return falha(mensagemErroAtacado(error));
    return ok();
  } catch {
    return falha(mensagemErroAtacado(null));
  }
}
