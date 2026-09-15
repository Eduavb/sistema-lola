"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";
import Header from "@/components/Header";
import { SiteFooter } from "@/components/PaymentsFooter";

export default function CarrinhoPage() {
  const { items, removeItem, setQuantidade, totalItens, totalValor, hydrated } = useCart();
  const router = useRouter();

  return (
    <>
      <Header />
      <section className="section">
        <div className="wrap" style={{ maxWidth: 760 }}>
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontWeight: 500,
              fontSize: 28,
              marginBottom: 28,
            }}
          >
            Seu carrinho
          </h1>

          {!hydrated ? (
            <div style={{ padding: "40px 0" }}>
              <div style={{ height: 14, width: 180, background: "var(--surface-muted)", borderRadius: 4 }} />
            </div>
          ) : items.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 22 }}>
                Seu carrinho está vazio.
              </p>
              <Link href="/" className="btn">
                Ver produtos →
              </Link>
            </div>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  background: "var(--line)",
                  marginBottom: 28,
                }}
              >
                {items.map((item) => {
                  const noMax = item.maxEstoque != null && item.quantidade >= item.maxEstoque;
                  const lineSubtotal = item.precoUnit * item.quantidade;
                  return (
                    <div
                      key={item.key}
                      style={{
                        background: "var(--surface)",
                        padding: "16px 18px",
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                      }}
                    >
                      <div
                        style={{
                          width: 64,
                          height: 64,
                          background: "var(--surface-muted)",
                          flex: "none",
                          overflow: "hidden",
                        }}
                      >
                        {item.imagem && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.imagem}
                            alt=""
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{item.nome}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>
                          {[item.corNome, item.tamanho].filter(Boolean).join(" · ")}
                        </div>
                        <div
                          style={{
                            fontSize: 12.5,
                            color: "var(--ink)",
                            fontWeight: 600,
                            marginTop: 4,
                          }}
                        >
                          {item.precoUnit.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button
                          aria-label="Diminuir quantidade"
                          onClick={() => setQuantidade(item.key, item.quantidade - 1)}
                          disabled={item.quantidade <= 1}
                          style={{
                            width: 26,
                            height: 26,
                            border: "1px solid var(--line)",
                            background: "none",
                            cursor: item.quantidade <= 1 ? "not-allowed" : "pointer",
                            fontSize: 14,
                            opacity: item.quantidade <= 1 ? 0.4 : 1,
                          }}
                        >
                          −
                        </button>
                        <span style={{ fontSize: 13, minWidth: 18, textAlign: "center" }}>
                          {item.quantidade}
                        </span>
                        <button
                          aria-label="Aumentar quantidade"
                          onClick={() => setQuantidade(item.key, item.quantidade + 1)}
                          disabled={noMax}
                          style={{
                            width: 26,
                            height: 26,
                            border: "1px solid var(--line)",
                            background: "none",
                            cursor: noMax ? "not-allowed" : "pointer",
                            fontSize: 14,
                            opacity: noMax ? 0.4 : 1,
                          }}
                        >
                          +
                        </button>
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          minWidth: 84,
                          textAlign: "right",
                        }}
                      >
                        {lineSubtotal.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </div>
                      <button
                        onClick={() => removeItem(item.key)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#b23b3b",
                          fontSize: 12,
                          cursor: "pointer",
                          marginLeft: 6,
                        }}
                      >
                        remover
                      </button>
                    </div>
                  );
                })}
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 24,
                }}
              >
                <span style={{ fontSize: 13, color: "var(--muted)" }}>
                  Subtotal ({totalItens} {totalItens === 1 ? "item" : "itens"})
                </span>
                <span style={{ fontSize: 20, fontWeight: 600, color: "var(--ink)" }}>
                  {totalValor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", gap: 14 }}>
                <Link
                  href="/"
                  style={{ fontSize: 12.5, color: "var(--muted)", alignSelf: "center" }}
                >
                  ← Continuar comprando
                </Link>
                <button className="btn" onClick={() => router.push("/checkout")}>
                  Finalizar compra →
                </button>
              </div>
            </>
          )}
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
