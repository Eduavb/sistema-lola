export const MSG_DESCARTAR = "Descartar alterações?";

export function temAlteracoes(inicial: unknown, atual: unknown): boolean {
  return JSON.stringify(inicial) !== JSON.stringify(atual);
}

/** Pergunta só quando há alterações; sem alterações fecha direto. */
export function confirmarDescarte(alterado: boolean): boolean {
  return !alterado || window.confirm(MSG_DESCARTAR);
}
