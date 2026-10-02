import Link from "next/link";
import type { BannerHero } from "@/lib/home";

function CtaLink({
  href,
  className,
  children,
}: {
  href: string;
  className: string;
  children: React.ReactNode;
}) {
  if (href.startsWith("/")) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}

export default function Hero({
  banner,
  imagemSrc,
}: {
  banner: BannerHero;
  imagemSrc: string | null;
}) {
  return (
    <section className="home-hero">
      {imagemSrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="home-hero-img" src={imagemSrc} alt="" decoding="async" fetchPriority="high" />
      )}
      <div className="home-hero-texto">
        <span className="home-hero-etiqueta">{banner.etiqueta}</span>
        <h1 className="home-hero-titulo">{banner.titulo}</h1>
        <p className="home-hero-sub">{banner.subtitulo}</p>
        <div className="home-hero-ctas">
          <CtaLink href={banner.cta1_link} className="home-cta home-cta--primario">
            {banner.cta1_texto}
          </CtaLink>
          {banner.cta2_mostrar && (
            <a href="#categorias" className="home-cta home-cta--secundario">
              {banner.cta2_texto}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
