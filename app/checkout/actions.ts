"use server";

import { headers } from "next/headers";
import { supabase } from "@/lib/supabase";
import { criarPreferencia, montarItensMP } from "@/lib/mercadopago";

export type ItemCarrinhoInput = {
  produtoId: string;
  colorId: string;
  sizeId: string | null;
  nome: string;
  cor: string | null;
  tamanho: string | null;
  quantidade: number;
  precoUnit: number;
};

export type DadosEntrega = {
  nome: string;
  telefone: string;
  entregaTipo: "retirada" | "entrega" | "entrega_fora";
  rua?: string;
  numero?: string;
  bairro?: string;
  complemento?: string;
  cep?: string;
  cidade?: string;
};

export async function criarPedido(
  itens: ItemCarrinhoInput[],
  dados: DadosEntrega
): Promise<{ url?: string; error?: string }> {
  // 1. Validação básica.
  if (!itens.length) return { error: "Carrinho vazio." };
  if (!dados.nome.trim()) return { error: "Informe seu nome." };
  if (!dados.telefone.trim()) return { error: "Informe seu telefone/WhatsApp." };
  if (
    (dados.entregaTipo === "entrega" || dados.entregaTipo === "entrega_fora") &&
    (!dados.rua?.trim() || !dados.numero?.trim() || !dados.bairro?.trim())
  ) {
    return { error: "Preencha o endereço completo pra entrega (rua, número e bairro)." };
  }
  if (dados.entregaTipo === "entrega_fora" && !dados.cidade?.trim()) {
    return { error: "Informe a cidade pra combinarmos o frete." };
  }

  // 2. Cria o pedido via RPC (sem secret — a RPC pública não recebe mais).
  const { data, error } = await supabase().rpc("checkout_iniciar_pedido", {
    p_cliente_nome: dados.nome.trim(),
    p_cliente_telefone: dados.telefone.trim(),
    p_entrega_tipo: dados.entregaTipo,
    p_endereco_rua: dados.rua ?? null,
    p_endereco_numero: dados.numero ?? null,
    p_endereco_bairro: dados.bairro ?? null,
    p_endereco_complemento: dados.complemento ?? null,
    p_endereco_cep: dados.cep ?? null,
    p_endereco_cidade:
      dados.entregaTipo === "entrega_fora" ? dados.cidade?.trim() ?? null : null,
    p_items: itens.map((i) => ({
      produto_id: i.produtoId,
      color_id: i.colorId,
      size_id: i.sizeId,
      quantidade: i.quantidade,
    })),
    p_is_atacado: false,
    p_customer_id: null,
    p_revendedor_id: null,
  });

  // 3. Erros amigáveis.
  if (error || !data) {
    const msg = error?.message ?? "";
    if (msg.includes("estoque insuficiente")) {
      return {
        error:
          "Um item do carrinho ficou sem estoque. Volte ao carrinho e ajuste as quantidades.",
      };
    }
    console.error("checkout_iniciar_pedido falhou:", error);
    return { error: "Não consegui criar o pedido agora. Tenta de novo em instantes." };
  }

  // 4. A RPC retorna jsonb { id, entrega_taxa, itens } — `itens` são as linhas
  //    precificadas no servidor (fonte da verdade do valor cobrado).
  const orderId = (data as { id: string }).id;
  const entregaTaxa = Number((data as { entrega_taxa?: number }).entrega_taxa ?? 0);
  const rpcItens =
    (data as { itens?: { titulo: string; quantidade: number; preco_unit: number }[] }).itens ?? [];

  // 5. Origin a partir dos headers da request (fallback pra env opcional).
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const origin = host ? `${proto}://${host}` : process.env.NEXT_PUBLIC_SITE_URL ?? "";

  // 6. Itens da preferência: derivados do retorno da RPC (preço recalculado no
  //    servidor), nunca do `precoUnit` que veio do cliente. A taxa de entrega
  //    entra como linha própria quando > 0.
  const mpItens = montarItensMP(rpcItens, entregaTaxa);
  // "entrega_fora" tem entrega_taxa === 0 — frete a combinar pelo WhatsApp, fora do site.

  // 7. Cria a preferência do Mercado Pago e devolve o link de pagamento.
  try {
    const pref = await criarPreferencia({
      itens: mpItens,
      externalReference: JSON.stringify({ order_id: orderId }),
      origin,
      successPath: `/pedido/${orderId}`,
    });
    return { url: pref.init_point };
  } catch (e) {
    console.error("criarPreferencia falhou:", e);
    return { error: "Não consegui gerar o pagamento agora. Tenta de novo em instantes." };
  }
}
