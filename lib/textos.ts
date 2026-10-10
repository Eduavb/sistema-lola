import { supabase } from "@/lib/supabase";

export const TEXTOS_PADRAO: Record<string, string> = {
  "aviso.texto": "TROCA FÁCIL EM 30 DIAS",
  "aviso.ativo": "true",
  "rodape.descricao": "Calçados e acessórios.",
  "rodape.ajuda1_texto": "Trocas e devoluções",
  "rodape.ajuda1_link": "",
  "rodape.ajuda2_texto": "Prazos de entrega",
  "rodape.ajuda2_link": "",
  "rodape.ajuda3_texto": "Fale com a gente",
  "rodape.ajuda3_link": "",
  "revendedora.etiqueta": "ATACADO LOLA",
  "revendedora.titulo": "Seja revendedora LOLA.",
  "revendedora.texto":
    "Preço de atacado a partir de 12 modelos diferentes. Cadastro com CNPJ, aprovação rápida.",
  "revendedora.botao": "Quero ser revendedor",
  "home.categorias_etiqueta": "",
  "home.categorias_titulo": "Categorias",
  "home.lancamentos_etiqueta": "ACABOU DE CHEGAR",
  "home.lancamentos_titulo": "Lançamentos",
  "login.etiqueta": "COLEÇÃO VERÃO 26",
  "login.titulo": "Pisa confiante.",
};

export function mesclarTextos(doBanco: unknown): Record<string, string> {
  const resultado = { ...TEXTOS_PADRAO };
  if (!doBanco || typeof doBanco !== "object" || Array.isArray(doBanco)) return resultado;
  const origem = doBanco as Record<string, unknown>;
  for (const chave of Object.keys(TEXTOS_PADRAO)) {
    const valor = origem[chave];
    if (typeof valor !== "string" || valor.trim() === "") continue;
    resultado[chave] = valor;
  }
  return resultado;
}

export async function getTextos(): Promise<Record<string, string>> {
  try {
    const { data, error } = await supabase().rpc("get_textos");
    if (error) return mesclarTextos(null);
    return mesclarTextos(data);
  } catch {
    return mesclarTextos(null);
  }
}
