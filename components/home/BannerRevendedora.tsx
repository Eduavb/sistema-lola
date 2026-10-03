import Link from "next/link";

export default function BannerRevendedora({ textos }: { textos: Record<string, string> }) {
  return (
    <section className="home-secao home-secao--revendedora">
      <div className="home-revendedora">
        <div className="home-revendedora-texto">
          <span className="home-revendedora-etiqueta">{textos["revendedora.etiqueta"]}</span>
          <h2 className="home-revendedora-titulo">{textos["revendedora.titulo"]}</h2>
          <p className="home-revendedora-p">{textos["revendedora.texto"]}</p>
          <div>
            <Link href="/entrar?modo=revendedor" className="home-cta home-cta--escuro">
              {textos["revendedora.botao"]}
            </Link>
          </div>
        </div>
        <div className="home-revendedora-bloco" aria-hidden="true" />
      </div>
    </section>
  );
}
