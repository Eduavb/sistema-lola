// Helper puro do webhook Mercado Pago. Sem `import "server-only"` de propósito:
// sem I/O nem segredos, testável em ambiente node (Vitest) e importado por
// `app/api/webhook/mercadopago/route.ts` (que puxa `lib/mercadopago`, este sim
// `server-only`).

/**
 * Extração pura do payment id — sem `req` nem I/O.
 * Regras (do reference): `data.id`/`id` da query quando não há `type`/`topic`
 * ou quando ele é `"payment"`; senão `body.type === "payment" && body.data.id`;
 * senão `null`.
 */
export function parsePaymentId(url: URL, body: unknown): string | null {
  const queryId = url.searchParams.get("data.id") ?? url.searchParams.get("id");
  const topic = url.searchParams.get("type") ?? url.searchParams.get("topic");

  if (queryId && (!topic || topic === "payment")) {
    return queryId;
  }

  const b = body as { type?: string; data?: { id?: unknown } } | null;
  if (b?.type === "payment" && b?.data?.id) {
    return String(b.data.id);
  }

  return null;
}
