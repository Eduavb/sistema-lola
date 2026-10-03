export default function AvisoBar({ texto, ativo }: { texto: string; ativo: string }) {
  if (ativo !== "true" || !texto.trim()) return null;
  return <div className="aviso-bar">{texto}</div>;
}
