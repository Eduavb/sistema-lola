"use client";

import { useState } from "react";
import type { Order, OrderStatus } from "@/lib/types";
import { ORDER_STATUS_LABEL, entregaTipoLabel } from "@/lib/types";
import { updateOrderStatus, settleOrder } from "@/app/admin/actions";

type Filtro = "todos" | "varejo" | "atacado";

const OPCOES_ENTREGA: OrderStatus[] = ["pago", "preparando", "enviado", "entregue", "cancelado"];
const OPCOES_RETIRADA: OrderStatus[] = ["pago", "preparando", "pronto_retirada", "retirado", "cancelado"];

const FILTROS: { key: Filtro; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "varejo", label: "Varejo" },
  { key: "atacado", label: "Atacado" },
];

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function PedidosTab({
  orders,
  filtro,
  onFiltro,
  onChange,
}: {
  orders: Order[];
  filtro: Filtro;
  onFiltro: (f: Filtro) => void;
  onChange: () => void;
}) {
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function handleStatus(id: string, status: OrderStatus) {
    setSalvandoId(id);
    const { error } = await updateOrderStatus(id, status);
    setSalvandoId(null);
    if (error) alert(`Não deu pra mudar o status: ${error}`);
    else onChange();
  }

  async function handleSettle(id: string) {
    if (
      !confirm(
        "Confirmar recebimento deste pedido? Isso baixa o estoque e registra a venda."
      )
    )
      return;
    setSalvandoId(id);
    const { error } = await settleOrder(id);
    setSalvandoId(null);
    if (error) alert(`Não deu pra marcar como pago: ${error}`);
    else onChange();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 24 }}>
          Pedidos ({orders.length})
        </h2>
        <div style={{ display: "flex", gap: 1, background: "var(--line)", border: "1px solid var(--line)" }}>
          {FILTROS.map((f) => (
            <button
              key={f.key}
              onClick={() => onFiltro(f.key)}
              style={{
                background: filtro === f.key ? "var(--accent)" : "var(--surface)",
                color: filtro === f.key ? "var(--ink)" : "var(--muted)",
                border: "none",
                padding: "7px 16px",
                fontSize: 12.5,
                cursor: "pointer",
                letterSpacing: "0.03em",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {orders.length === 0 ? (
        <p style={{ fontSize: 13.5, color: "var(--muted)" }}>Nenhum pedido neste filtro.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 1, background: "var(--line)" }}>
          {orders.map((o) => {
            const opcoes = o.entrega_tipo !== "retirada" ? OPCOES_ENTREGA : OPCOES_RETIRADA;
            const aberto = expandedId === o.id;
            return (
              <div key={o.id} style={{ background: "var(--surface)" }}>
                <div
                  style={{
                    padding: "14px 18px",
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    onClick={() => setExpandedId(aberto ? null : o.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left", flex: 1, minWidth: 220 }}
                  >
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>
                      #{o.id.slice(0, 8)} · {o.cliente_nome}
                      {o.is_atacado && (
                        <span
                          style={{
                            marginLeft: 8,
                            fontSize: 10.5,
                            fontWeight: 600,
                            color: "var(--accent)",
                            border: "1px solid var(--accent)",
                            padding: "1px 6px",
                          }}
                        >
                          Atacado
                        </span>
                      )}
                      <span style={{ fontWeight: 400, color: "var(--muted)" }}>
                        {" "}
                        · {new Date(o.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>
                      {entregaTipoLabel(o.entrega_tipo)} ·{" "}
                      {o.items.length} item(ns) · {brl(o.valor_total)}
                      {o.entrega_tipo === "entrega_fora" ? " · frete a combinar" : ""}
                    </div>
                  </button>

                  {o.status === "pendente" && (
                    <button
                      onClick={() => handleSettle(o.id)}
                      disabled={salvandoId === o.id}
                      style={{
                        background: "var(--accent)",
                        color: "var(--ink)",
                        border: "none",
                        padding: "8px 12px",
                        fontSize: 12,
                        cursor: "pointer",
                        letterSpacing: "0.03em",
                      }}
                    >
                      Marcar como pago
                    </button>
                  )}

                  <select
                    value={o.status}
                    disabled={salvandoId === o.id}
                    onChange={(e) => handleStatus(o.id, e.target.value as OrderStatus)}
                    style={{ padding: "8px 10px", border: "1px solid var(--line)", fontSize: 12.5 }}
                  >
                    {opcoes.map((s) => (
                      <option key={s} value={s}>
                        {ORDER_STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </div>

                {aberto && (
                  <div style={{ padding: "0 18px 18px", display: "flex", gap: 32, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", marginBottom: 8 }}>
                        Itens
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {o.items.map((item) => (
                          <div key={item.id} style={{ fontSize: 12.5 }}>
                            {item.quantidade}× {item.produto_nome}
                            {item.produto_cor ? ` — ${item.produto_cor}` : ""}
                            {item.produto_tamanho ? ` / ${item.produto_tamanho}` : ""}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", marginBottom: 8 }}>
                        {o.entrega_tipo !== "retirada" ? "Endereço de entrega" : "Retirada"}
                      </div>
                      {o.entrega_tipo !== "retirada" ? (
                        <p style={{ fontSize: 12.5, color: "var(--ink)", lineHeight: 1.6, margin: 0 }}>
                          {o.endereco_rua}, {o.endereco_numero}
                          {o.endereco_complemento ? ` — ${o.endereco_complemento}` : ""}
                          <br />
                          {o.endereco_bairro}
                          {o.endereco_cidade ? ` — ${o.endereco_cidade}` : ""}
                          {o.endereco_cep ? ` · CEP ${o.endereco_cep}` : ""}
                        </p>
                      ) : (
                        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: 0 }}>Cliente retira na loja.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
