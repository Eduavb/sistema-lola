"use client";

import { useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Heart } from "lucide-react";
import SwingTag from "@/components/SwingTag";
import { formatarReais, textoParcela3x, type CartaoLancamento } from "@/lib/home";

const CHAVE_FAVORITOS = "lola:favoritos";

const ouvintes = new Set<() => void>();
let memoria = "";

function lerBruto(): string {
  try {
    return window.localStorage.getItem(CHAVE_FAVORITOS) ?? memoria;
  } catch {
    return memoria;
  }
}

function gravarBruto(valor: string) {
  memoria = valor;
  try {
    window.localStorage.setItem(CHAVE_FAVORITOS, valor);
  } catch {}
  ouvintes.forEach((fn) => fn());
}

function assinar(fn: () => void) {
  ouvintes.add(fn);
  window.addEventListener("storage", fn);
  return () => {
    ouvintes.delete(fn);
    window.removeEventListener("storage", fn);
  };
}

function lerIds(bruto: string): string[] {
  try {
    const dados: unknown = JSON.parse(bruto || "[]");
    return Array.isArray(dados) ? dados.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function alternarFavorito(id: string) {
  const ids = lerIds(lerBruto());
  const novos = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
  gravarBruto(JSON.stringify(novos));
}

export default function Lancamentos({
  produtos,
  etiqueta,
  titulo,
}: {
  produtos: CartaoLancamento[];
  etiqueta: string;
  titulo: string;
}) {
  const trilho = useRef<HTMLDivElement>(null);
  const bruto = useSyncExternalStore(assinar, lerBruto, () => "");
  const favoritos = lerIds(bruto);

  function rolar(direcao: 1 | -1) {
    const el = trilho.current;
    if (!el) return;
    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: direcao * el.clientWidth * 0.8, behavior: reduzido ? "auto" : "smooth" });
  }

  return (
    <section className="home-secao home-secao--lancamentos" id="lancamentos">
      <div className="home-secao-cab home-secao-cab--setas">
        <div>
          {etiqueta.trim() !== "" && <span className="home-etiqueta">{etiqueta}</span>}
          <h2 className="home-titulo">{titulo}</h2>
        </div>
        {produtos.length > 0 && (
          <div className="home-setas">
            <button
              type="button"
              className="home-seta"
              onClick={() => rolar(-1)}
              aria-label="Lançamentos anteriores"
            >
              <ChevronLeft size={20} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="home-seta"
              onClick={() => rolar(1)}
              aria-label="Próximos lançamentos"
            >
              <ChevronRight size={20} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {produtos.length === 0 ? (
        <p className="home-vazio">Os lançamentos chegam em breve.</p>
      ) : (
        <div className="home-trilho" ref={trilho} role="region" aria-label={titulo} tabIndex={0}>
          {produtos.map((p) => {
            const favorito = favoritos.includes(p.id);
            return (
              <article key={p.id} className="home-lanc">
                <Link href={p.slug ? `/produto/${p.slug}` : "#"} className="home-lanc-link">
                  <div className="home-lanc-foto">
                    {p.imagem ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imagem} alt={p.nome} loading="lazy" />
                    ) : (
                      <span className="home-lanc-semfoto">Sem foto ainda</span>
                    )}
                  </div>
                  <div className="home-lanc-info">
                    <span className="home-lanc-cat">{p.categoria}</span>
                    <span className="home-lanc-nome">{p.nome}</span>
                    <div className="home-lanc-precos">
                      {p.precoOriginal != null && (
                        <span className="home-lanc-antigo">{formatarReais(p.precoOriginal)}</span>
                      )}
                      <span className="home-lanc-preco">{formatarReais(p.preco)}</span>
                      <span className="home-lanc-parcela">{textoParcela3x(p.preco)}</span>
                    </div>
                    {p.cores.length > 0 && (
                      <div className="home-lanc-cores">
                        {p.cores.map((c, i) => (
                          <span
                            key={`${c.hex}-${i}`}
                            className="home-lanc-cor"
                            style={{ background: c.hex }}
                            title={c.nome}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
                <div className="home-lanc-tag">
                  <SwingTag color="#8FE3C8" textColor="#2B2420" size="sm" rotate={-3}>
                    NOVO
                  </SwingTag>
                </div>
                <button
                  type="button"
                  className="home-fav"
                  aria-pressed={favorito}
                  aria-label={favorito ? `Remover ${p.nome} dos favoritos` : `Favoritar ${p.nome}`}
                  onClick={() => alternarFavorito(p.id)}
                >
                  <Heart size={16} aria-hidden="true" fill={favorito ? "currentColor" : "none"} />
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
