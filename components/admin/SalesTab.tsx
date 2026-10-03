"use client";

import { useState } from "react";
import type { Product, Sale } from "@/lib/types";
import { insertSale, deleteSale } from "@/app/admin/actions";
import SwingTag from "@/components/SwingTag";
import { corStatus } from "@/lib/admin-status";

type Filtro = "todos" | "varejo" | "atacado";

const FILTROS: { key: Filtro; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "varejo", label: "Varejo" },
  { key: "atacado", label: "Atacado" },
];

// `sales.status` é texto livre gravado pelas RPCs (`admin_insert_sale`,
// `_settle_order`) — hoje sempre 'aprovado', mas o schema também prevê
// 'pendente'/'cancelado' (ver docs/superpowers/specs). `corStatus` espera
// label em PT-BR apresentável, não o valor cru.
const SALE_STATUS_LABEL: Record<string, string> = {
  aprovado: "Pago",
  pendente: "Pendente",
  cancelado: "Cancelado",
};

const COLS = "110px 1.4fr 1.3fr 130px 150px 120px 90px";

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function SalesTab({
  products,
  sales,
  filtro,
  onFiltro,
  onChange,
}: {
  products: Product[];
  sales: Sale[];
  filtro: Filtro;
  onFiltro: (f: Filtro) => void;
  onChange: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const total = sales.reduce((sum, s) => sum + Number(s.valor_total), 0);
  const aReceberAtacado = sales
    .filter((s) => s.is_atacado && s.status !== "aprovado")
    .reduce((sum, s) => sum + Number(s.valor_total), 0);
  const ticketMedio = sales.length ? total / sales.length : 0;
  // TODO(F3): repasse de revendedor — sem conceito no schema ainda
  const repassesPendentes = 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 24 }}>Financeiro</h2>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 6, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: 4 }}>
            {FILTROS.map((f) => (
              <button
                key={f.key}
                onClick={() => onFiltro(f.key)}
                style={{
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  background: filtro === f.key ? "var(--peach)" : "transparent",
                  color: filtro === f.key ? "var(--ink)" : "var(--adm-text-secondary)",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            style={{ background: "var(--peach)", color: "var(--ink)", border: "none", borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            {showForm ? "Fechar" : "+ Lançar venda"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16 }}>
        <KpiCard label="RECEITA TOTAL" value={brl(total)} />
        <KpiCard label="A RECEBER (ATACADO)" value={brl(aReceberAtacado)} valueColor="var(--adm-purple-text)" />
        <KpiCard label="TICKET MÉDIO" value={brl(ticketMedio)} />
        <KpiCard label="REPASSES PENDENTES" value={brl(repassesPendentes)} valueColor="var(--adm-text-secondary)" />
      </div>

      {showForm && (
        <SaleForm
          products={products}
          onDone={() => {
            setShowForm(false);
            onChange();
          }}
        />
      )}

      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, overflowX: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: COLS, minWidth: 900, padding: "14px 20px", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--adm-text-secondary)", letterSpacing: "0.04em", borderBottom: "1px solid var(--line)" }}>
          <div>DATA</div>
          <div>PRODUTO</div>
          <div>CLIENTE / REVENDEDOR</div>
          <div>VALOR</div>
          <div>PAGAMENTO</div>
          <div>STATUS</div>
          <div>AÇÕES</div>
        </div>

        {sales.length === 0 ? (
          <div style={{ padding: 24, fontSize: 13, color: "var(--adm-text-secondary)" }}>
            Nenhuma venda neste filtro.
          </div>
        ) : (
          sales.map((s) => {
            const label = SALE_STATUS_LABEL[s.status] ?? s.status;
            const cor = corStatus(label);
            return (
              <div
                key={s.id}
                style={{ display: "grid", gridTemplateColumns: COLS, minWidth: 900, padding: "14px 20px", alignItems: "center", borderBottom: "1px solid var(--line)" }}
              >
                <div style={{ fontSize: 12.5, color: "var(--adm-text-secondary)" }}>
                  {new Date(s.data).toLocaleDateString("pt-BR")}
                </div>
                <div style={{ minWidth: 0, overflow: "hidden" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.produto_nome}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--adm-text-secondary)" }}>
                    {s.produto_cor || "—"} {s.produto_tamanho ? `/ ${s.produto_tamanho}` : ""} · {s.quantidade}×
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: s.is_atacado ? 600 : 400, color: s.is_atacado ? "var(--adm-purple-text)" : "var(--ink)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {s.cliente || "—"}
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600 }}>{brl(Number(s.valor_total))}</div>
                <div style={{ fontSize: 12.5, color: "var(--adm-text-secondary)" }}>{s.forma_pagamento || "—"}</div>
                <div>
                  <SwingTag color={cor.bg} textColor={cor.text} size="sm">
                    {label}
                  </SwingTag>
                </div>
                <div>
                  <button
                    onClick={async () => {
                      if (confirm("Excluir essa venda?")) {
                        const { error } = await deleteSale(s.id);
                        if (error) alert(`Não deu pra excluir a venda: ${error}`);
                        else onChange();
                      }
                    }}
                    style={{ background: "none", border: "none", color: "var(--adm-pink-text)", cursor: "pointer", fontSize: 12 }}
                  >
                    excluir
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value, valueColor = "var(--ink)" }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 20 }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--adm-text-secondary)", letterSpacing: "0.04em" }}>{label}</div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(20px,2.2vw,28px)", fontWeight: 600, marginTop: 8, color: valueColor }}>{value}</div>
    </div>
  );
}

function SaleForm({ products, onDone }: { products: Product[]; onDone: () => void }) {
  const [produtoId, setProdutoId] = useState("");
  const [colorId, setColorId] = useState("");
  const [sizeId, setSizeId] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [forma, setForma] = useState("Pix");
  const [cliente, setCliente] = useState("");
  const [isAtacado, setIsAtacado] = useState(false);
  const [saving, setSaving] = useState(false);

  const produto = products.find((p) => p.id === produtoId);
  const cor = produto?.colors.find((c) => c.id === colorId);
  const precoUnit = produto?.preco ?? 0;
  const valorTotal = precoUnit * (parseInt(quantidade) || 0);

  async function handleSubmit() {
    if (!produto) return;
    setSaving(true);
    const { error } = await insertSale({
      produto_id: produto.id,
      produto_nome: produto.nome,
      quantidade: parseInt(quantidade) || 1,
      preco_unit: precoUnit,
      valor_total: valorTotal,
      forma_pagamento: forma,
      cliente,
      produto_cor: cor?.nome ?? null,
      produto_tamanho: cor?.sizes.find((s) => s.id === sizeId)?.tamanho ?? null,
      size_id: sizeId || null,
      is_atacado: isAtacado,
    });
    setSaving(false);
    if (error) {
      alert(`Não deu pra registrar a venda: ${error}`);
      return;
    }
    onDone();
  }

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--ink-soft)", borderRadius: 16, padding: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
        <select
          value={produtoId}
          onChange={(e) => {
            setProdutoId(e.target.value);
            setColorId("");
            setSizeId("");
          }}
          style={{ padding: "9px 10px", border: "1px solid var(--line)", fontSize: 13 }}
        >
          <option value="">Produto…</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
        <select value={colorId} onChange={(e) => { setColorId(e.target.value); setSizeId(""); }} disabled={!produto} style={{ padding: "9px 10px", border: "1px solid var(--line)", fontSize: 13 }}>
          <option value="">Cor…</option>
          {produto?.colors.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
        <select value={sizeId} onChange={(e) => setSizeId(e.target.value)} disabled={!cor} style={{ padding: "9px 10px", border: "1px solid var(--line)", fontSize: 13 }}>
          <option value="">Tamanho…</option>
          {cor?.sizes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.tamanho} (estoque: {s.estoque})
            </option>
          ))}
        </select>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
        <input type="number" min={1} value={quantidade} onChange={(e) => setQuantidade(e.target.value)} placeholder="Quantidade" style={{ padding: "9px 10px", border: "1px solid var(--line)", fontSize: 13 }} />
        <select value={forma} onChange={(e) => setForma(e.target.value)} style={{ padding: "9px 10px", border: "1px solid var(--line)", fontSize: 13 }}>
          <option>Pix</option>
          <option>Cartão de crédito</option>
          <option>Boleto</option>
          <option>Dinheiro</option>
        </select>
        <select
          value={isAtacado ? "atacado" : "varejo"}
          onChange={(e) => setIsAtacado(e.target.value === "atacado")}
          style={{ padding: "9px 10px", border: "1px solid var(--line)", fontSize: 13 }}
        >
          <option value="varejo">Varejo</option>
          <option value="atacado">Atacado</option>
        </select>
        <input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Cliente (opcional)" style={{ padding: "9px 10px", border: "1px solid var(--line)", fontSize: 13 }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13 }}>
          Total: <strong>{brl(valorTotal)}</strong>
        </span>
        <button className="btn" onClick={handleSubmit} disabled={!produto || saving} style={{ padding: "10px 22px", fontSize: 12 }}>
          {saving ? "Salvando…" : "Registrar venda"}
        </button>
      </div>
    </div>
  );
}
