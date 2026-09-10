"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { precoVarejo, precisaNumeracao, type Product } from "@/lib/types";
import ProductGallery from "@/components/ProductGallery";
import { useCart } from "@/lib/cart";

export default function ProductDetail({ product }: { product: Product }) {
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
  // Acessórios não têm tamanho pro cliente escolher, mas o estoque é guardado
  // num único registro "de tamanho" nos bastidores (ver admin ProductEditor).
  const acessorioEstoque = !precisaTamanho ? sizes[0] : undefined;
  const acessorioEsgotado = Boolean(acessorioEstoque) && acessorioEstoque!.estoque <= 0;
  const podeComprar =
    Boolean(activeColor) && (precisaTamanho ? Boolean(sizeId) : !acessorioEsgotado);
  const { addItem } = useCart();
  const router = useRouter();

  function pickColor(i: number) {
    setColorIdx(i);
    setSizeId(null);
    setErroCompra(null);
  }

  function handleComprar() {
    if (!activeColor || !podeComprar) return;
    setErroCompra(null);

    const tamanhoSelecionado = precisaTamanho
      ? sizes.find((s) => s.id === sizeId)
      : null;
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
    setTimeout(() => router.push("/carrinho"), 500);
  }

  return (
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
        <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 10 }}>
          {product.categoria?.nome || product.colecao || ""}
        </div>
        <h1
          style={{
            fontFamily: "var(--font-playfair)",
            fontWeight: 500,
            fontSize: 32,
            marginBottom: 12,
          }}
        >
          {product.nome}
        </h1>
        <div style={{ fontSize: 20, color: "var(--navy)", fontWeight: 600, marginBottom: 24 }}>
          {temDesconto ? (
            <>
              <span
                style={{
                  fontSize: 14,
                  color: "var(--muted)",
                  textDecoration: "line-through",
                  fontWeight: 400,
                  marginRight: 10,
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
                <span style={{ position: "absolute", left: 0, color: "var(--gold-deep)" }}>—</span>
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
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: c.hex || "#ccc",
                    border: i === colorIdx ? "2px solid var(--navy)" : "2px solid var(--surface)",
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
          <div style={{ marginBottom: 26 }}>
            <div style={{ fontSize: 11.5, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>
              Tamanho
            </div>
            {sizes.length === 0 ? (
              <p style={{ fontSize: 12.5, color: "var(--muted)" }}>Tamanhos a cadastrar.</p>
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
                        minWidth: 44,
                        padding: "10px 12px",
                        fontSize: 13,
                        border: sizeId === s.id ? "1.5px solid var(--navy)" : "1px solid var(--line)",
                        background: esgotado ? "var(--navy-tint)" : sizeId === s.id ? "var(--navy)" : "var(--surface)",
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

        <button
          className="btn"
          onClick={handleComprar}
          disabled={!podeComprar || adicionado}
          style={{
            width: "100%",
            justifyContent: "center",
            opacity: podeComprar && !adicionado ? 1 : 0.45,
            cursor: podeComprar && !adicionado ? "pointer" : "not-allowed",
          }}
        >
          {adicionado ? "Adicionado ✓" : "Adicionar ao carrinho →"}
        </button>
        {erroCompra && (
          <p style={{ fontSize: 11.5, color: "#b23b3b", marginTop: 10, textAlign: "center" }}>
            {erroCompra}
          </p>
        )}
        {precisaTamanho && !sizeId && sizes.length > 0 && (
          <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 10, textAlign: "center" }}>
            Selecione o tamanho pra liberar a compra
          </p>
        )}
        {acessorioEsgotado && (
          <p style={{ fontSize: 11.5, color: "#b23b3b", marginTop: 10, textAlign: "center" }}>
            Esse produto está sem estoque no momento.
          </p>
        )}
      </div>

      <style>{`
        @media (max-width: 860px) {
          .pdp-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
        }
      `}</style>
    </div>
  );
}
