"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import { BRAND } from "@/lib/brand.config";
import { criarPedido, type ItemCarrinhoInput } from "./actions";
import Header from "@/components/Header";
import { SiteFooter } from "@/components/PaymentsFooter";
import { CamposEntrega, DADOS_VAZIOS, type DadosForm } from "./CamposEntrega";

export default function CheckoutVarejo() {
  const { items, totalValor, hydrated } = useCart();
  const [dados, setDados] = useState<DadosForm>(DADOS_VAZIOS);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function set<K extends keyof DadosForm>(campo: K, valor: DadosForm[K]) {
    setDados((d) => ({ ...d, [campo]: valor }));
  }

  const precisaEndereco =
    dados.entregaTipo === "entrega" || dados.entregaTipo === "entrega_fora";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (enviando || items.length === 0) return;
    setErro(null);

    if (!dados.nome.trim() || !dados.telefone.trim()) {
      setErro("Preencha nome e telefone.");
      return;
    }
    if (
      precisaEndereco &&
      (!dados.rua.trim() || !dados.numero.trim() || !dados.bairro.trim())
    ) {
      setErro("Preencha o endereço completo (rua, número e bairro).");
      return;
    }
    if (dados.entregaTipo === "entrega_fora" && !dados.cidade.trim()) {
      setErro("Informe a cidade pra combinarmos o frete.");
      return;
    }

    setEnviando(true);

    const itens: ItemCarrinhoInput[] = items.map((i) => ({
      produtoId: i.produtoId,
      colorId: i.colorId,
      sizeId: i.sizeId,
      nome: i.nome,
      cor: i.corNome,
      tamanho: i.tamanho,
      quantidade: i.quantidade,
      precoUnit: i.precoUnit,
    }));

    const res = await criarPedido(itens, {
      nome: dados.nome,
      telefone: dados.telefone,
      entregaTipo: dados.entregaTipo,
      rua: dados.rua,
      numero: dados.numero,
      bairro: dados.bairro,
      complemento: dados.complemento,
      cep: dados.cep,
      cidade: dados.cidade,
    });

    if (res.error) {
      setErro(res.error);
      setEnviando(false);
      return;
    }
    if (res.url) {
      // Não limpamos o carrinho aqui — só quando o pagamento confirmar.
      window.location.href = res.url;
    }
  }

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
              marginBottom: 8,
            }}
          >
            Finalizar pedido
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
              <Link href="/carrinho" style={{ fontSize: 12.5, color: "var(--muted)" }}>
                ← Voltar pro carrinho
              </Link>

              <form
                onSubmit={handleSubmit}
                style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 22 }}
              >
                <CamposEntrega dados={dados} set={set} />

                <div
                  style={{
                    borderTop: "1px solid var(--line)",
                    paddingTop: 18,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {items.map((i) => (
                    <div
                      key={i.key}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 12.5,
                        color: "var(--muted)",
                      }}
                    >
                      <span>
                        {[i.nome, i.corNome, i.tamanho].filter(Boolean).join(" · ")} × {i.quantidade}
                      </span>
                      <span>
                        {(i.precoUnit * i.quantidade).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </span>
                    </div>
                  ))}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 18,
                      fontWeight: 600,
                      color: "var(--ink)",
                      marginTop: 4,
                    }}
                  >
                    <span>Total dos produtos</span>
                    <span>
                      {totalValor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                  </div>
                  {dados.entregaTipo === "entrega" && (
                    <p style={{ fontSize: 11.5, color: "var(--muted)", margin: 0 }}>
                      Taxa de entrega calculada no checkout.
                    </p>
                  )}
                  {dados.entregaTipo === "entrega_fora" && (
                    <p style={{ fontSize: 11.5, color: "var(--muted)", margin: 0 }}>
                      Frete a combinar pelo{" "}
                      <a href={BRAND.whatsappUrl} target="_blank" rel="noopener noreferrer">
                        WhatsApp
                      </a>
                      .
                    </p>
                  )}
                </div>

                {erro && (
                  <p style={{ fontSize: 12.5, color: "#b23b3b", textAlign: "center" }}>{erro}</p>
                )}

                <button
                  className="btn"
                  type="submit"
                  disabled={enviando}
                  style={{ justifyContent: "center", opacity: enviando ? 0.6 : 1 }}
                >
                  {enviando ? "Abrindo pagamento…" : "Ir para o pagamento →"}
                </button>
                <p style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", margin: 0 }}>
                  Pagamento com Pix ou cartão via Mercado Pago.
                </p>
              </form>
            </>
          )}
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
