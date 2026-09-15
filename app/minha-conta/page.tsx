"use client";

import { useState } from "react";
import Link from "next/link";
import type { Order } from "@/lib/types";
import { ORDER_STATUS_LABEL, entregaTipoLabel } from "@/lib/types";
import { buscarPedidosPorTelefone } from "./actions";
import Header from "@/components/Header";
import { SiteFooter } from "@/components/PaymentsFooter";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function MinhaContaPage() {
  const [telefone, setTelefone] = useState("");
  const [pedidos, setPedidos] = useState<Order[] | null>(null);
  const [buscando, setBuscando] = useState(false);

  async function buscar(tel: string) {
    if (!tel.trim()) return;
    setBuscando(true);
    try {
      const res = await buscarPedidosPorTelefone(tel);
      setPedidos(res);
    } finally {
      setBuscando(false);
    }
  }

  return (
    <>
      <Header />
      <section className="section">
        <div className="wrap" style={{ maxWidth: 640 }}>
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontWeight: 500,
              fontSize: 28,
              marginBottom: 10,
            }}
          >
            Meus pedidos
          </h1>
          <p style={{ fontSize: 13.5, color: "var(--muted)", marginBottom: 6 }}>
            Digite o telefone que você usou na compra para ver seus pedidos. Não precisa de senha.
          </p>
          <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 24 }}>
            Em breve: crie uma conta para ver seu histórico automaticamente.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              buscar(telefone);
            }}
            style={{ display: "flex", gap: 10, marginBottom: 32 }}
          >
            <input
              type="tel"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(00) 00000-0000"
              aria-label="Telefone"
              style={{
                flex: 1,
                padding: "11px 12px",
                border: "1px solid var(--line)",
                fontSize: 13.5,
              }}
            />
            <button className="btn" type="submit" disabled={buscando} style={{ padding: "0 24px" }}>
              {buscando ? "Buscando…" : "Buscar"}
            </button>
          </form>

          {pedidos !== null &&
            (pedidos.length === 0 ? (
              <p style={{ fontSize: 13.5, color: "var(--muted)", textAlign: "center" }}>
                Nenhum pedido encontrado para esse telefone.
              </p>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  background: "var(--line)",
                }}
              >
                {pedidos.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      background: "var(--surface)",
                      padding: "16px 18px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 14,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600 }}>
                        Pedido #{p.id.slice(0, 8)} ·{" "}
                        {new Date(p.created_at).toLocaleDateString("pt-BR")}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>
                        {ORDER_STATUS_LABEL[p.status]} · {entregaTipoLabel(p.entrega_tipo)} ·{" "}
                        {brl(p.valor_total)}
                      </div>
                    </div>
                    <Link
                      href={`/pedido/${p.id}`}
                      style={{
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: "var(--accent)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Ver pedido →
                    </Link>
                  </div>
                ))}
              </div>
            ))}
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
