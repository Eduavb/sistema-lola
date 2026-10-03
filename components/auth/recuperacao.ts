export function lerHashRecuperacao(hash: string): string | null {
  const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  if (params.get("error") || params.get("error_code")) return null;
  if (params.get("type") !== "recovery") return null;
  const token = params.get("access_token");
  return token ? token : null;
}
