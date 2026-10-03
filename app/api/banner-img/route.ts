import { supabase } from "@/lib/supabase";
import { respostaImagem } from "@/lib/imagem";

export async function GET(request: Request) {
  try {
    const { data, error } = await supabase().rpc("get_banner_hero");
    if (error || !data || typeof data !== "object") return new Response(null, { status: 404 });
    return respostaImagem(
      (data as Record<string, unknown>).imagem,
      request.headers.get("if-none-match")
    );
  } catch {
    return new Response(null, { status: 404 });
  }
}
