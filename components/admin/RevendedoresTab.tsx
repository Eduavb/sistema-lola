"use client";

import { useState } from "react";
import type { Revendedor } from "@/app/admin/actions";
import SwingTag from "@/components/SwingTag";
import { corStatus } from "@/lib/admin-status";

const STATUS_LABEL: Record<Revendedor["status"], string> = {
  pendente: "Cadastro pendente",
  aprovado: "Aprovado",
  recusado: "Recusado",
};

export default function RevendedoresTab({
  revendedores,
  onAprovar,
  onRecusar,
  onCadastrar,
}: {
  revendedores: Revendedor[];
  onAprovar: (id: string) => void;
  onRecusar: (id: string) => void;
  onCadastrar: (nome: string, cidade: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState("");
  const [cidade, setCidade] = useState("");

  function handleCadastrar() {
    if (!nome.trim()) return;
    onCadastrar(nome.trim(), cidade.trim());
    setNome("");
    setCidade("");
    setShowForm(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={() => setShowForm((v) => !v)}
          style={{ background: "var(--peach)", color: "var(--ink)", border: "none", borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          {showForm ? "Fechar" : "+ Cadastrar revendedor"}
        </button>
      </div>

      {showForm && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 20, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 200px" }}>
            <label style={{ fontSize: 12, color: "var(--adm-text-secondary)", display: "block", marginBottom: 6 }}>Nome da loja</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }} />
          </div>
          <div style={{ flex: "1 1 200px" }}>
            <label style={{ fontSize: 12, color: "var(--adm-text-secondary)", display: "block", marginBottom: 6 }}>Cidade</label>
            <input value={cidade} onChange={(e) => setCidade(e.target.value)} style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }} />
          </div>
          <button onClick={handleCadastrar} disabled={!nome.trim()} style={{ background: nome.trim() ? "var(--peach)" : "var(--line)", color: "var(--ink)", border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: nome.trim() ? "pointer" : "not-allowed" }}>
            Cadastrar
          </button>
        </div>
      )}

      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, overflowX: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 110px 160px 180px", minWidth: 820, padding: "14px 20px", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--adm-text-secondary)", letterSpacing: "0.04em", borderBottom: "1px solid var(--line)" }}>
          <div>LOJA</div><div>CIDADE</div><div>SOLICITADO</div><div>STATUS</div><div>AÇÕES</div>
        </div>
        {revendedores.length === 0 ? (
          <div style={{ padding: 24, fontSize: 13, color: "var(--adm-text-secondary)" }}>Nenhum revendedor cadastrado ainda.</div>
        ) : (
          revendedores.map((r) => {
            const cor = corStatus(STATUS_LABEL[r.status]);
            return (
              <div key={r.id} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 110px 160px 180px", minWidth: 820, padding: "16px 20px", alignItems: "center", borderBottom: "1px solid var(--line)" }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{r.nome}</div>
                <div style={{ fontSize: 13, color: "var(--adm-text-secondary)" }}>{r.cidade}</div>
                <div style={{ fontSize: 12, color: "var(--adm-text-secondary)" }}>{new Date(r.created_at).toLocaleDateString("pt-BR")}</div>
                <div>
                  {r.status === "pendente" ? (
                    <SwingTag color={cor.bg} textColor={cor.text} size="sm">Cadastro pendente</SwingTag>
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--adm-text-secondary)" }}>{STATUS_LABEL[r.status]}</span>
                  )}
                </div>
                {r.status === "pendente" ? (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => onAprovar(r.id)} style={{ background: "var(--adm-success-bg)", border: "1px solid var(--mint)", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Aprovar</button>
                    <button onClick={() => onRecusar(r.id)} style={{ background: "var(--adm-pink-bg)", border: "1px solid var(--pink)", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Recusar</button>
                  </div>
                ) : <div />}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
