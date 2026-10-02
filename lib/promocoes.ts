import { supabase } from "@/lib/supabase";
import type { PromocaoAtiva } from "@/lib/pricing";

export async function getPromocoesAtivas(): Promise<PromocaoAtiva[]> {
  try {
    const { data, error } = await supabase().rpc("get_promocoes_ativas");
    if (error || !Array.isArray(data)) return [];
    return data as PromocaoAtiva[];
  } catch {
    return [];
  }
}
