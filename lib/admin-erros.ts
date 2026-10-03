export const MSG_ERRO_GENERICO = "Não foi possível concluir agora. Tente de novo.";
export const MSG_DADOS_INVALIDOS = "Dados inválidos.";

export function traduzirErroCategoria(mensagem: string): string {
  return traduzirPorLista(
    mensagem,
    [
      [/duplicate key|unique|já existe/, "Já existe uma categoria com esse nome/slug."],
      [/produtos/, "Essa categoria tem produtos — mova ou exclua os produtos antes."],
    ],
    "Não foi possível salvar a categoria agora. Tente de novo."
  );
}

/** Guarda de formato para actions: nunca confiar no tipo vindo do cliente. */
export function textosValidos(obj: unknown, chaves: string[]): boolean {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  return chaves.every((c) => typeof o[c] === "string");
}

/**
 * As RPCs levantam mensagens próprias em PT-BR; só estas passam para a tela.
 * Qualquer outra (constraint, SQL, rede) vira texto genérico, sem vazar detalhe.
 */
export function traduzirPorLista(
  mensagem: string,
  conhecidas: [RegExp, string][],
  generico: string = MSG_ERRO_GENERICO
): string {
  const m = mensagem.toLowerCase();
  if (/sem permiss|42501|not authorized|permission denied/.test(m)) return "Sem permissão.";
  for (const [padrao, texto] of conhecidas) if (padrao.test(m)) return texto;
  return generico;
}
