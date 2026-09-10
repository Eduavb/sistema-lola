"use server";

import { supabase } from "@/lib/supabase";
import type { Order } from "@/lib/types";

export async function buscarPedidosPorTelefone(telefone: string): Promise<Order[]> {
  const { data, error } = await supabase().rpc("public_lookup_orders", { p_telefone: telefone });
  if (error || !data) return [];
  return data as unknown as Order[];
}
