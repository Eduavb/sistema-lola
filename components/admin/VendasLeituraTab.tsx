"use client";

import type { Sale } from "@/lib/types";

type Filtro = "todos" | "varejo" | "atacado";

const FILTROS: { key: Filtro; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "varejo", label: "Varejo" },
  { key: "atacado", label: "Atacado" },
];

const COLUNAS = "100px 1.6fr 80px 130px 1.2fr 90px";

/**
 * Lista de vendas somente leitura para o supervisor. O banco devolve
 * preco_unit e valor_total nulos para esse papel: esta tela nunca mostra
 * valores, totais nem ações de escrita.
 */
export default function VendasLeituraTab({
  sales,
  filtro,
  onFiltro,
}: {
  sales: Sale[];
  filtro: Filtro;
  onFiltro: (f: Filtro) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="adm-topo">
        <div className="adm-segmento" role="group" aria-label="Filtrar vendas por origem">
          {FILTROS.map((f) => (
            <button key={f.key} type="button" aria-pressed={filtro === f.key} onClick={() => onFiltro(f.key)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="adm-tabela" role="table" aria-label="Vendas">
        <div className="adm-tabela-cab" role="row" style={{ gridTemplateColumns: COLUNAS, minWidth: 820 }}>
          <div role="columnheader">DATA</div>
          <div role="columnheader">PRODUTO</div>
          <div role="columnheader">QTD.</div>
          <div role="columnheader">PAGAMENTO</div>
          <div role="columnheader">CLIENTE</div>
          <div role="columnheader">ORIGEM</div>
        </div>
        {sales.length === 0 ? (
          <div className="adm-tabela-vazia">Nenhuma venda neste filtro.</div>
        ) : (
          sales.map((s) => {
            const variacao = [s.produto_cor, s.produto_tamanho].filter(Boolean).join(" / ");
            return (
              <div key={s.id} className="adm-tabela-linha" role="row" style={{ gridTemplateColumns: COLUNAS, minWidth: 820 }}>
                <div role="cell" style={{ fontSize: 12.5, color: "var(--adm-text-secondary)" }}>
                  {new Date(s.data).toLocaleDateString("pt-BR")}
                </div>
                <div role="cell" style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.produto_nome}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--adm-text-secondary)" }}>{variacao || "—"}</div>
                </div>
                <div role="cell" style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>
                  {s.quantidade}
                </div>
                <div role="cell" style={{ fontSize: 12.5, color: "var(--adm-text-secondary)" }}>
                  {s.forma_pagamento || "—"}
                </div>
                <div role="cell" style={{ fontSize: 13, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {s.cliente || "—"}
                </div>
                <div role="cell" style={{ fontSize: 12.5, fontWeight: s.is_atacado ? 600 : 400, color: s.is_atacado ? "var(--adm-purple-text)" : "var(--ink)" }}>
                  {s.is_atacado ? "Atacado" : "Loja"}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
