import { supabase } from "@/lib/supabase";
import { idCategoriaValido, respostaImagem } from "@/lib/imagem";

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!idCategoriaValido(id)) return new Response(null, { status: 404 });
  try {
    const { data, error } = await supabase()
      .from("categorias")
      .select("imagem")
      .eq("id", id)
      .eq("ativo", true)
      .maybeSingle();
    if (error || !data) return new Response(null, { status: 404 });
    return respostaImagem(data.imagem, request.headers.get("if-none-match"));
  } catch {
    return new Response(null, { status: 404 });
  }
}
