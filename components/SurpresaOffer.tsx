"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { precoVarejo, precisaNumeracao, type Product } from "@/lib/types";
import { BRAND } from "@/lib/brand.config";
import ProductGallery from "@/components/ProductGallery";
import { PaymentsStrip, SiteFooter } from "@/components/PaymentsFooter";
import { useCart } from "@/lib/cart";

export default function SurpresaOffer({ product }: { product: Product }) {
  const colors = product.colors ?? [];
  const [colorIdx, setColorIdx] = useState(0);
  const [sizeId, setSizeId] = useState<string | null>(null);
  const [adicionado, setAdicionado] = useState(false);
  const [erroCompra, setErroCompra] = useState<string | null>(null);
  const activeColor = colors[colorIdx];
  const sizes = activeColor?.sizes ?? [];
  const precisaTamanho = precisaNumeracao(product.categoria?.grupo);
  const temDesconto = product.desconto_percentual != null && product.desconto_percentual > 0;
  const precoFinal = precoVarejo(product);
  // Acessórios não têm tamanho pro cliente escolher, mas o estoque mora num
  // único registro "de tamanho" nos bastidores (ver admin ProductEditor).
  const acessorioEstoque = !precisaTamanho ? sizes[0] : undefined;
  const acessorioEsgotado = Boolean(acessorioEstoque) && acessorioEstoque!.estoque <= 0;
  const podeComprar =
    Boolean(activeColor) && (precisaTamanho ? Boolean(sizeId) : !acessorioEsgotado);
  const { addItem } = useCart();
  const router = useRouter();

  const tamanhoSelecionado = precisaTamanho ? sizes.find((s) => s.id === sizeId) : null;
  const estoqueBaixo =
    (precisaTamanho && tamanhoSelecionado && tamanhoSelecionado.estoque > 0 && tamanhoSelecionado.estoque <= 3) ||
    (!precisaTamanho && acessorioEstoque && acessorioEstoque.estoque > 0 && acessorioEstoque.estoque <= 3);
  const estoqueBaixoQtd = precisaTamanho ? tamanhoSelecionado?.estoque : acessorioEstoque?.estoque;
  const categoriaLabel = product.categoria?.nome || product.colecao || "";

  function pickColor(i: number) {
    setColorIdx(i);
    setSizeId(null);
    setErroCompra(null);
  }

  function handleComprar() {
    if (!activeColor || !podeComprar) return;
    setErroCompra(null);

    if (precisaTamanho && tamanhoSelecionado && tamanhoSelecionado.estoque < 1) {
      setErroCompra("Esse tamanho ficou sem estoque. Escolha outro.");
      return;
    }
    if (!precisaTamanho && acessorioEstoque && acessorioEstoque.estoque < 1) {
      setErroCompra("Esse produto ficou sem estoque.");
      return;
    }

    addItem({
      produtoId: product.id,
      colorId: activeColor.id,
      sizeId: precisaTamanho ? sizeId : acessorioEstoque?.id ?? null,
      nome: product.nome,
      corNome: activeColor.nome,
      tamanho: tamanhoSelecionado?.tamanho ?? null,
      precoUnit: precoFinal,
      imagem: activeColor.imagens?.[0] ?? null,
      quantidade: 1,
      maxEstoque: precisaTamanho
        ? tamanhoSelecionado?.estoque ?? null
        : acessorioEstoque?.estoque ?? null,
    });

    setAdicionado(true);
    // Vai direto pro checkout — sem passar pela tela de carrinho — pra máxima
    // conversão na live.
    setTimeout(() => router.push("/checkout"), 350);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div
        style={{
          background: "var(--ink)",
          color: "#fff",
          textAlign: "center",
          padding: "10px 16px",
          fontSize: 12,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 9,
        }}
      >
        <span className="live-dot" aria-hidden />
        Oferta exclusiva da live — só enquanto durar o estoque
      </div>

      <header
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <div
          className="wrap"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 32px",
          }}
        >
          <Link
            href="/"
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 20,
              letterSpacing: "0.14em",
              color: "var(--ink-soft)",
            }}
          >
            {BRAND.nome}
          </Link>
          <a
            href={BRAND.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 12, color: "var(--ink-soft)", display: "flex", alignItems: "center", gap: 7 }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--ink-soft)" strokeWidth={1.5} width={17} height={17}>
              <path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.55L3 20l1.02-5.4A8.5 8.5 0 1 1 21 11.5z" />
            </svg>
            <span className="wa-label">Dúvidas no WhatsApp</span>
          </a>
        </div>
      </header>

      <section className="section" style={{ paddingTop: 40 }}>
        <div className="wrap">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.1fr 1fr",
              gap: 56,
              alignItems: "start",
            }}
            className="pdp-grid"
          >
            <ProductGallery images={activeColor?.imagens ?? []} alt={product.nome} />

            <div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--accent-deep)",
                  fontWeight: 700,
                  marginBottom: 14,
                }}
              >
                🎁 Oferta exclusiva da live
              </div>
              {categoriaLabel && (
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--muted)",
                    marginBottom: 10,
                  }}
                >
                  {categoriaLabel}
                </div>
              )}
              <h1
                style={{
                  fontFamily: "var(--font-serif)",
                  fontWeight: 500,
                  fontSize: 34,
                  marginBottom: 14,
                }}
              >
                {product.nome}
              </h1>
              <div style={{ fontSize: 26, color: "var(--accent)", fontWeight: 700, marginBottom: 24 }}>
                {temDesconto ? (
                  <>
                    <span
                      style={{
                        fontSize: 16,
                        color: "var(--muted)",
                        textDecoration: "line-through",
                        fontWeight: 400,
                        marginRight: 12,
                      }}
                    >
                      {product.preco?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                    {precoFinal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </>
                ) : (
                  product.preco?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                )}
              </div>

              {product.descricao && (
                <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--ink)", marginBottom: 26 }}>
                  {product.descricao}
                </p>
              )}

              {product.caracteristicas?.length ? (
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: "0 0 30px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    fontSize: 13,
                    color: "var(--muted)",
                  }}
                >
                  {product.caracteristicas.map((c, i) => (
                    <li key={i} style={{ paddingLeft: 16, position: "relative" }}>
                      <span style={{ position: "absolute", left: 0, color: "var(--accent-deep)" }}>—</span>
                      {c}
                    </li>
                  ))}
                </ul>
              ) : null}

              {colors.length > 1 && (
                <div style={{ marginBottom: 22 }}>
                  <div style={{ fontSize: 11.5, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>
                    Cor: <strong style={{ color: "var(--ink)" }}>{activeColor?.nome}</strong>
                  </div>
                  <div style={{ display: "flex", gap: 9 }}>
                    {colors.map((c, i) => (
                      <button
                        key={c.id}
                        onClick={() => pickColor(i)}
                        title={c.nome}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          background: c.hex || "#ccc",
                          border: i === colorIdx ? "2px solid var(--accent)" : "2px solid var(--surface)",
                          boxShadow: "0 0 0 1px var(--line)",
                          cursor: "pointer",
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
              {colors.length === 1 && (
                <div className="unica" style={{ marginBottom: 22 }}>
                  Cor única
                </div>
              )}

              {precisaTamanho && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11.5, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>
                    Numeração
                  </div>
                  {sizes.length === 0 ? (
                    <p style={{ fontSize: 12.5, color: "var(--muted)" }}>Numeração a cadastrar.</p>
                  ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {sizes.map((s) => {
                        const esgotado = s.estoque <= 0;
                        return (
                          <button
                            key={s.id}
                            disabled={esgotado}
                            onClick={() => setSizeId(s.id)}
                            style={{
                              minWidth: 46,
                              padding: "11px 12px",
                              fontSize: 13.5,
                              border: sizeId === s.id ? "1.5px solid var(--accent)" : "1px solid var(--line)",
                              background: esgotado ? "var(--surface-muted)" : sizeId === s.id ? "var(--accent)" : "var(--surface)",
                              color: esgotado ? "var(--muted)" : sizeId === s.id ? "#fff" : "var(--ink)",
                              cursor: esgotado ? "not-allowed" : "pointer",
                              textDecoration: esgotado ? "line-through" : "none",
                            }}
                          >
                            {s.tamanho}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {estoqueBaixo && (
                <p style={{ fontSize: 12, color: "#b23b3b", fontWeight: 600, marginBottom: 18 }}>
                  ⚡ Só {estoqueBaixoQtd} {estoqueBaixoQtd === 1 ? "unidade" : "unidades"} restando — corre!
                </p>
              )}

              <button
                className="btn"
                onClick={handleComprar}
                disabled={!podeComprar || adicionado}
                style={{
                  width: "100%",
                  justifyContent: "center",
                  fontSize: 14,
                  padding: "20px 34px",
                  opacity: podeComprar && !adicionado ? 1 : 0.45,
                  cursor: podeComprar && !adicionado ? "pointer" : "not-allowed",
                }}
              >
                {adicionado ? "Levando pro pagamento…" : "Comprar agora →"}
              </button>
              <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 10, textAlign: "center" }}>
                Pagamento seguro via Mercado Pago · Pix ou cartão
              </p>
              {erroCompra && (
                <p style={{ fontSize: 11.5, color: "#b23b3b", marginTop: 10, textAlign: "center" }}>{erroCompra}</p>
              )}
              {precisaTamanho && !sizeId && sizes.length > 0 && (
                <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 10, textAlign: "center" }}>
                  Selecione a numeração pra liberar a compra
                </p>
              )}
              {acessorioEsgotado && (
                <p style={{ fontSize: 11.5, color: "#b23b3b", marginTop: 10, textAlign: "center" }}>
                  Esse produto ficou sem estoque nessa live.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <PaymentsStrip />
      <SiteFooter />

      <style>{`
        @media (max-width: 860px) {
          .pdp-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
        }
        @media (max-width: 520px) {
          .wa-label { display: none; }
        }
        .live-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #ff6161;
          box-shadow: 0 0 0 0 rgba(255,97,97,.7);
          animation: live-pulse 1.6s infinite;
        }
        @keyframes live-pulse {
          0% { box-shadow: 0 0 0 0 rgba(255,97,97,.6); }
          70% { box-shadow: 0 0 0 7px rgba(255,97,97,0); }
          100% { box-shadow: 0 0 0 0 rgba(255,97,97,0); }
        }
      `}</style>
    </div>
  );
}
