import Link from "next/link";

const BENEFICIOS = ["Cadastro com CNPJ", "Aprovação rápida", "Preço de atacado"];

export default function HeroRevendedora({ textos }: { textos: Record<string, string> }) {
  return (
    <section className="home-hero home-hero--revendedora">
      <div className="home-hero-texto">
        <span className="home-hero-etiqueta">{textos["revendedora.etiqueta"]}</span>
        <h2 className="home-hero-titulo">{textos["revendedora.titulo"]}</h2>
        <p className="home-hero-sub">{textos["revendedora.texto"]}</p>
        <div className="home-hero-ctas">
          <Link href="/entrar?modo=revendedor" className="home-cta home-cta--escuro">
            {textos["revendedora.botao"]}
          </Link>
        </div>
      </div>
      <ul className="home-hero-beneficios" aria-label="Vantagens para revendedores">
        {BENEFICIOS.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
    </section>
  );
}
