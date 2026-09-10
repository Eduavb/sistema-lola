"use client";

import { useState } from "react";
import type { Product, Sale } from "@/lib/types";
import { insertSale, deleteSale } from "@/app/admin/actions";

type Filtro = "todos" | "varejo" | "atacado";

const FILTROS: { key: Filtro; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "varejo", label: "Varejo" },
  { key: "atacado", label: "Atacado" },
];

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
  const totalMes = sales
    .filter((s) => s.data?.slice(0, 7) === new Date().toISOString().slice(0, 7))
    .reduce((sum, s) => sum + Number(s.valor_total), 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ fontFamily: "var(--font-playfair)", fontStyle: "italic", fontSize: 24 }}>Financeiro</h2>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 1, background: "var(--line)", border: "1px solid var(--line)" }}>
            {FILTROS.map((f) => (
              <button
                key={f.key}
                onClick={() => onFiltro(f.key)}
                style={{
                  background: filtro === f.key ? "var(--navy)" : "var(--surface)",
                  color: filtro === f.key ? "#fff" : "var(--muted)",
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
          <button className="btn" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Fechar" : "+ Lançar venda"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 26, flexWrap: "wrap" }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", padding: "18px 22px", flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total geral</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: "var(--navy)" }}>{brl(total)}</div>
        </div>
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", padding: "18px 22px", flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Este mês</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: "var(--navy)" }}>{brl(totalMes)}</div>
        </div>
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", padding: "18px 22px", flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Vendas registradas</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: "var(--navy)" }}>{sales.length}</div>
        </div>
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

      {sales.length === 0 ? (
        <p style={{ fontSize: 13.5, color: "var(--muted)" }}>Nenhuma venda neste filtro.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid var(--line)", color: "var(--muted)", fontSize: 11 }}>
              <th style={{ padding: "8px 6px" }}>Data</th>
              <th style={{ padding: "8px 6px" }}>Produto</th>
              <th style={{ padding: "8px 6px" }}>Cor/Tam.</th>
              <th style={{ padding: "8px 6px" }}>Qtd</th>
              <th style={{ padding: "8px 6px" }}>Valor</th>
              <th style={{ padding: "8px 6px" }}>Pagamento</th>
              <th style={{ padding: "8px 6px" }}>Segmento</th>
              <th style={{ padding: "8px 6px" }}>Origem</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sales.map((s) => (
              <tr key={s.id} style={{ borderBottom: "1px solid var(--line)" }}>
                <td style={{ padding: "8px 6px" }}>{new Date(s.data).toLocaleDateString("pt-BR")}</td>
                <td style={{ padding: "8px 6px" }}>{s.produto_nome}</td>
                <td style={{ padding: "8px 6px", color: "var(--muted)" }}>
                  {s.produto_cor || "—"} {s.produto_tamanho ? `/ ${s.produto_tamanho}` : ""}
                  {s.origem === "mercado_pago" && !s.produto_tamanho && (
                    <div style={{ color: "var(--gold-deep)", fontSize: 11 }}>baixar estoque manualmente</div>
                  )}
                </td>
                <td style={{ padding: "8px 6px" }}>{s.quantidade}</td>
                <td style={{ padding: "8px 6px" }}>{brl(Number(s.valor_total))}</td>
                <td style={{ padding: "8px 6px" }}>{s.forma_pagamento || "—"}</td>
                <td style={{ padding: "8px 6px" }}>{s.is_atacado ? "Atacado" : "Varejo"}</td>
                <td style={{ padding: "8px 6px", textTransform: "capitalize" }}>{s.origem}</td>
                <td style={{ padding: "8px 6px" }}>
                  <button
                    onClick={async () => {
                      if (confirm("Excluir essa venda?")) {
                        const { error } = await deleteSale(s.id);
                        if (error) alert(`Não deu pra excluir a venda: ${error}`);
                        else onChange();
                      }
                    }}
                    style={{ background: "none", border: "none", color: "#b23b3b", cursor: "pointer", fontSize: 12 }}
                  >
                    excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
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
    <div style={{ background: "var(--surface)", border: "1px solid var(--navy)", padding: 20, marginBottom: 26 }}>
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
