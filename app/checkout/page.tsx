"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import { BRAND } from "@/lib/brand.config";
import { criarPedido, type ItemCarrinhoInput } from "./actions";
import Header from "@/components/Header";
import { SiteFooter } from "@/components/PaymentsFooter";

type EntregaTipo = "retirada" | "entrega" | "entrega_fora";

type DadosForm = {
  nome: string;
  telefone: string;
  entregaTipo: EntregaTipo;
  rua: string;
  numero: string;
  bairro: string;
  complemento: string;
  cep: string;
  cidade: string;
};

const DADOS_VAZIOS: DadosForm = {
  nome: "",
  telefone: "",
  entregaTipo: "retirada",
  rua: "",
  numero: "",
  bairro: "",
  complemento: "",
  cep: "",
  cidade: "",
};

const OPCOES: { valor: EntregaTipo; titulo: string; descricao: string }[] = [
  {
    valor: "retirada",
    titulo: "Retirar na loja — grátis",
    descricao: "Você retira o pedido pessoalmente na loja, sem custo de entrega.",
  },
  {
    valor: "entrega",
    titulo: "Receber em casa",
    descricao: "Entrega no seu endereço. A taxa de entrega é calculada no checkout.",
  },
  {
    valor: "entrega_fora",
    titulo: "Entrega em outra cidade — frete a combinar",
    descricao:
      "Para fora da área de entrega. O frete é combinado pelo WhatsApp depois da compra; o pagamento aqui cobre só os produtos.",
  },
];

export default function CheckoutPage() {
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

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "11px 12px",
    border: "1px solid var(--line)",
    fontSize: 13.5,
    background: "#fff",
  };
  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 11.5,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: "var(--muted)",
    marginBottom: 6,
  };

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
                <div>
                  <label style={labelStyle}>Nome completo</label>
                  <input
                    style={inputStyle}
                    value={dados.nome}
                    onChange={(e) => set("nome", e.target.value)}
                    placeholder="Seu nome"
                    required
                  />
                </div>
                <div>
                  <label style={labelStyle}>WhatsApp / telefone</label>
                  <input
                    style={inputStyle}
                    value={dados.telefone}
                    onChange={(e) => set("telefone", e.target.value)}
                    placeholder="(00) 90000-0000"
                    required
                  />
                  <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
                    É por esse número que a loja fala com você sobre o pedido.
                  </p>
                </div>

                <div>
                  <label style={labelStyle}>Como você quer receber</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {OPCOES.map((op) => (
                      <label
                        key={op.valor}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 10,
                          padding: "12px 14px",
                          border:
                            dados.entregaTipo === op.valor
                              ? "1.5px solid var(--accent)"
                              : "1px solid var(--line)",
                          cursor: "pointer",
                          fontSize: 13.5,
                        }}
                      >
                        <input
                          type="radio"
                          name="entregaTipo"
                          style={{ marginTop: 3 }}
                          checked={dados.entregaTipo === op.valor}
                          onChange={() => set("entregaTipo", op.valor)}
                        />
                        <span>
                          <strong style={{ color: "var(--ink-soft)" }}>{op.titulo}</strong>
                          <br />
                          <span style={{ color: "var(--muted)", fontSize: 12 }}>{op.descricao}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {precisaEndereco && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 14,
                      background: "var(--surface-muted)",
                      padding: 18,
                    }}
                  >
                    {dados.entregaTipo === "entrega_fora" && (
                      <div>
                        <label style={labelStyle}>Cidade</label>
                        <input
                          style={inputStyle}
                          value={dados.cidade}
                          onChange={(e) => set("cidade", e.target.value)}
                          required
                        />
                      </div>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
                      <div>
                        <label style={labelStyle}>Rua</label>
                        <input
                          style={inputStyle}
                          value={dados.rua}
                          onChange={(e) => set("rua", e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Número</label>
                        <input
                          style={inputStyle}
                          value={dados.numero}
                          onChange={(e) => set("numero", e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div>
                        <label style={labelStyle}>Bairro</label>
                        <input
                          style={inputStyle}
                          value={dados.bairro}
                          onChange={(e) => set("bairro", e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>CEP (opcional)</label>
                        <input
                          style={inputStyle}
                          value={dados.cep}
                          onChange={(e) => set("cep", e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}>Complemento (opcional)</label>
                      <input
                        style={inputStyle}
                        value={dados.complemento}
                        onChange={(e) => set("complemento", e.target.value)}
                        placeholder="Apto, bloco, ponto de referência…"
                      />
                    </div>
                  </div>
                )}

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
