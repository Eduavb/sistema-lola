import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { corBlocoCategoria } from "@/lib/home";

export type CategoriaVitrine = {
  id: string;
  nome: string;
  slug: string;
  /** URL da rota de imagem com cache (nunca o base64). */
  imagem: string | null;
};

export default function Categorias({
  categorias,
  titulo,
  etiqueta,
}: {
  categorias: CategoriaVitrine[];
  titulo: string;
  etiqueta: string;
}) {
  if (categorias.length === 0) return null;

  return (
    <section className="home-secao" id="categorias">
      <div className="home-secao-cab">
        {etiqueta.trim() !== "" && <span className="home-etiqueta">{etiqueta}</span>}
        <h2 className="home-titulo">{titulo}</h2>
      </div>
      <div className="home-cat-grid">
        {categorias.map((c, i) => (
          <Link key={c.id} href={`/#cat-${c.slug}`} className="home-cat">
            <div className="home-cat-foto" style={{ background: corBlocoCategoria(i) }}>
              {c.imagem && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.imagem} alt={c.nome} loading="lazy" decoding="async" />
              )}
            </div>
            <div className="home-cat-nome">
              <span>{c.nome}</span>
              <ArrowRight size={16} aria-hidden="true" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
