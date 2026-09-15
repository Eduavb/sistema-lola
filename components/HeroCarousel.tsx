"use client";

import { useEffect, useRef, useState } from "react";
import SwingTag from "@/components/SwingTag";

export type HeroSlide = {
  src: string | null;
  /** Versão pra telas pequenas (opcional). Se não passar, usa `src` nos dois. */
  srcMobile?: string;
  alt: string;
  placeholderLabel?: string;
  /** Controla que parte da foto fica visível quando o banner corta a imagem
   * (ex: "center top" pra priorizar o rosto quando a base fica de fora). */
  objectPosition?: string;
  /** "contain" mostra a foto inteira sem cortar nada (com uma faixa de fundo
   * dos lados quando a foto não tem exatamente a proporção do banner). */
  fit?: "cover" | "contain";
};

export default function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const carouselRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduceMotion || slides.length < 2) return;
    startAuto();
    return stopAuto;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides.length]);

  function startAuto() {
    stopAuto();
    timerRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % slides.length);
    }, 5500);
  }
  function stopAuto() {
    if (timerRef.current) clearInterval(timerRef.current);
  }

  return (
    <section
      ref={carouselRef}
      style={{ position: "relative", overflow: "hidden" }}
      onMouseEnter={stopAuto}
      onMouseLeave={startAuto}
      onFocus={stopAuto}
      onBlur={startAuto}
    >
      <div
        style={{
          display: "flex",
          width: `${slides.length * 100}%`,
          height: "min(72vh, 640px)",
          transition: "transform .55s cubic-bezier(.4,0,.2,1)",
          transform: `translateX(-${(current * 100) / slides.length}%)`,
        }}
        className="hero-track"
      >
        {slides.map((s, i) =>
          s.src ? (
            <div
              key={i}
              style={{
                position: "relative",
                width: `${100 / slides.length}%`,
                height: "100%",
                flex: "none",
                background: s.fit === "contain" ? "var(--bg)" : undefined,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.src}
                alt={s.alt}
                className={s.srcMobile ? "hero-img hero-img-desktop" : "hero-img"}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: s.fit ?? "cover",
                  objectPosition: s.objectPosition ?? "center",
                  display: "block",
                }}
              />
              {s.srcMobile && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={s.srcMobile}
                  alt={s.alt}
                  className="hero-img hero-img-mobile"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              )}
            </div>
          ) : (
            <div
              key={i}
              className="hero-placeholder"
              style={{
                position: "relative",
                width: `${100 / slides.length}%`,
                height: "100%",
                flex: "none",
              }}
            >
              <div className="hero-placeholder-grain" aria-hidden />
              <div className="hero-placeholder-inner fade-up">
                <SwingTag color="var(--peach)" size="lg" rotate={-6}>
                  {s.placeholderLabel ?? "Nova coleção"}
                </SwingTag>
                <h2 className="hero-placeholder-title">Nova coleção</h2>
                <p className="hero-placeholder-sub">Espaço reservado — aguardando imagem</p>
              </div>
            </div>
          )
        )}
      </div>

      {slides.length > 1 && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: 22,
            transform: "translateX(-50%)",
            display: "flex",
            gap: 9,
            zIndex: 2,
          }}
        >
          {slides.map((_, i) => (
            <button
              key={i}
              aria-label={`Banner ${i + 1}`}
              onClick={() => {
                setCurrent(i);
                startAuto();
              }}
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                border: "1.5px solid var(--ink)",
                background: i === current ? "var(--ink)" : "rgba(43,36,32,.35)",
                padding: 0,
                cursor: "pointer",
              }}
            />
          ))}
        </div>
      )}

      <style>{`
        .hero-img-mobile { position: absolute; inset: 0; display: none; }
        @media (max-width: 700px) {
          .hero-track { height: 62vw !important; min-height: 230px !important; max-height: 380px !important; }
          .hero-img-desktop { display: none; }
          .hero-img-mobile { display: block; }
        }
        .hero-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          overflow: hidden;
          background: linear-gradient(135deg, var(--pink) 0%, var(--peach) 100%);
        }
        .hero-placeholder-grain {
          position: absolute;
          inset: 0;
          opacity: 0.18;
          background-image: radial-gradient(rgba(43, 36, 32, 0.5) 1px, transparent 1px);
          background-size: 3px 3px;
          mix-blend-mode: multiply;
        }
        .hero-placeholder-inner {
          position: relative;
          z-index: 1;
          padding: 0 24px;
        }
        .hero-placeholder-title {
          font-family: var(--font-display), sans-serif;
          font-weight: 800;
          font-size: var(--fs-hero);
          line-height: 0.95;
          color: var(--ink);
          margin: 18px 0 8px;
        }
        .hero-placeholder-sub {
          font-family: var(--font-sans), sans-serif;
          font-size: 13px;
          color: var(--ink);
          opacity: 0.65;
          margin: 0;
        }
      `}</style>
    </section>
  );
}
