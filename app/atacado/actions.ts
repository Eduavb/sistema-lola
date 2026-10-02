"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSessao } from "@/lib/auth";
import { supabaseComToken } from "@/lib/supabase";
import {
  ehUuid,
  mensagemErroAtacado,
  normalizarCarrinho,
  proximaQuantidade,
  quantidadeValida,
} from "@/lib/atacado";
import { cadastroAprovado, registrarErro } from "./dados";

export type ResultadoAcao = { error: string | null };

const ERRO_ENTRADA = "Item inválido. Atualize a página e tente de novo.";
const ERRO_ESTOQUE = "Não há mais estoque disponível para esse item.";
const ERRO_ITEM_NAO_ENCONTRADO = "Esse item não está mais no seu carrinho.";
const ERRO_SESSAO = "Sua sessão expirou. Entre novamente para continuar.";
const ERRO_NAO_APROVADO = "Seu cadastro de revendedor não está aprovado.";

function ok(): ResultadoAcao {
  revalidatePath("/atacado", "layout");
  return { error: null };
}

function falha(mensagem: string): ResultadoAcao {
  return { error: mensagem };
}

async function preparar(): Promise<{ db: SupabaseClient; erro: null } | { db: null; erro: string }> {
  const sessao = await getSessao({ renovar: true });
  if (!sessao) return { db: null, erro: ERRO_SESSAO };
  const db = supabaseComToken(sessao.accessToken);
  if (!(await cadastroAprovado(db))) return { db: null, erro: ERRO_NAO_APROVADO };
  return { db, erro: null };
}

function falhaRpc(contexto: string, erro: { code?: string; message?: string }): ResultadoAcao {
  registrarErro(contexto, erro);
  return falha(mensagemErroAtacado(erro));
}

function falhaInesperada(contexto: string, e: unknown): ResultadoAcao {
  registrarErro(contexto, { message: e instanceof Error ? e.message : String(e) });
  return falha(mensagemErroAtacado(null));
}

export async function addAoCarrinho(
  productId: string,
  colorId: string,
  sizeId: string
): Promise<ResultadoAcao> {
  try {
    if (!ehUuid(productId) || !ehUuid(colorId) || !ehUuid(sizeId)) return falha(ERRO_ENTRADA);
    const { db, erro } = await preparar();
    if (!db) return falha(erro);

    const lido = await db.rpc("atacado_cart_get");
    if (lido.error) return falhaRpc("addAoCarrinho/cart_get", lido.error);
    const carrinho = normalizarCarrinho(lido.data);
    const linha = carrinho.itens.find(
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
      if (error) return falhaRpc("addAoCarrinho/estoque", error);
      if (!data) return falha(ERRO_ENTRADA);
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
    if (error) return falhaRpc("addAoCarrinho/set_item", error);
    return ok();
  } catch (e) {
    return falhaInesperada("addAoCarrinho", e);
  }
}

export async function alterarQuantidade(
  itemId: string,
  quantidade: number
): Promise<ResultadoAcao> {
  try {
    if (!ehUuid(itemId) || !quantidadeValida(quantidade)) return falha(ERRO_ENTRADA);
    const { db, erro } = await preparar();
    if (!db) return falha(erro);

    const lido = await db.rpc("atacado_cart_get");
    if (lido.error) return falhaRpc("alterarQuantidade/cart_get", lido.error);
    const linha = normalizarCarrinho(lido.data).itens.find((i) => i.id === itemId);
    if (!linha) return falha(ERRO_ITEM_NAO_ENCONTRADO);
    if (quantidade > linha.quantidade && quantidade > linha.estoque) return falha(ERRO_ESTOQUE);

    const { error } = await db.rpc("atacado_cart_set_item", {
      p_product_id: linha.product_id,
      p_color_id: linha.color_id,
      p_size_id: linha.size_id,
      p_quantidade: quantidade,
    });
    if (error) return falhaRpc("alterarQuantidade/set_item", error);
    return ok();
  } catch (e) {
    return falhaInesperada("alterarQuantidade", e);
  }
}

export async function removerItem(itemId: string): Promise<ResultadoAcao> {
  try {
    if (!ehUuid(itemId)) return falha(ERRO_ENTRADA);
    const { db, erro } = await preparar();
    if (!db) return falha(erro);
    const { error } = await db.rpc("atacado_cart_remove_item", { p_id: itemId });
    if (error) return falhaRpc("removerItem", error);
    return ok();
  } catch (e) {
    return falhaInesperada("removerItem", e);
  }
}
