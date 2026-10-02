export const MSG_ERRO_GENERICO = "Não foi possível concluir agora. Tente de novo.";

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
