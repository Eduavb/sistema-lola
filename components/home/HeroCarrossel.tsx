"use client";

import { useEffect, useState, type ReactNode } from "react";

const INTERVALO_MS = 7000;

export default function HeroCarrossel({ slides }: { slides: ReactNode[] }) {
  const [ativo, setAtivo] = useState(0);
  const [pausado, setPausado] = useState(false);
  const total = slides.length;

  useEffect(() => {
    if (pausado || total < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setAtivo((i) => (i + 1) % total), INTERVALO_MS);
    return () => clearInterval(t);
  }, [pausado, total]);

  return (
    <div
      className="hero-carrossel"
      role="region"
      aria-roledescription="carrossel"
      aria-label="Destaques da LOLA"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
    >
      {slides.map((s, i) => (
        <div
          key={i}
          className={i === ativo ? "hero-slide hero-slide--ativo" : "hero-slide"}
          aria-hidden={i !== ativo}
          inert={i !== ativo}
        >
          {s}
        </div>
      ))}
      {total > 1 && (
        <div className="hero-pontos">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              className={i === ativo ? "hero-ponto hero-ponto--ativo" : "hero-ponto"}
              aria-label={`Ir para o destaque ${i + 1} de ${total}`}
              aria-current={i === ativo}
              onClick={() => setAtivo(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
