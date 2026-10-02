"use client";

import { useState } from "react";
import type { Revendedor } from "@/lib/types";
import SwingTag from "@/components/SwingTag";
import { corStatus } from "@/lib/admin-status";

const STATUS_LABEL: Record<Revendedor["status"], string> = {
  pendente: "Cadastro pendente",
  aprovado: "Aprovado",
  recusado: "Recusado",
};

const COLS = "1.4fr 1.3fr 1fr 110px 160px 180px";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid var(--line)",
  borderRadius: 8,
  fontSize: 13,
  boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--adm-text-secondary)",
  display: "block",
  marginBottom: 6,
};

export type NovoRevendedor = { razao_social: string; email: string; cidade: string };

export default function RevendedoresTab({
  revendedores,
  onAprovar,
  onRecusar,
  onCadastrar,
}: {
  revendedores: Revendedor[];
  onAprovar?: (id: string) => void;
  onRecusar?: (id: string) => void;
  onCadastrar: (dados: NovoRevendedor) => Promise<{ error?: string }>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [razao, setRazao] = useState("");
  const [email, setEmail] = useState("");
  const [cidade, setCidade] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const valido = razao.trim() !== "" && email.trim() !== "";
  const podeDecidir = Boolean(onAprovar && onRecusar);

  async function handleCadastrar() {
    if (!valido || salvando) return;
    setSalvando(true);
    setErro(null);
    const { error } = await onCadastrar({
      razao_social: razao.trim(),
      email: email.trim().toLowerCase(),
      cidade: cidade.trim(),
    });
    setSalvando(false);
    if (error) {
      setErro(`Não deu pra cadastrar: ${error}`);
      return;
    }
    setRazao("");
    setEmail("");
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
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ flex: "1 1 200px" }}>
              <label style={labelStyle}>Razão social *</label>
              <input value={razao} onChange={(e) => setRazao(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ flex: "1 1 200px" }}>
              <label style={labelStyle}>E-mail *</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ flex: "1 1 160px" }}>
              <label style={labelStyle}>Cidade</label>
              <input value={cidade} onChange={(e) => setCidade(e.target.value)} style={inputStyle} />
            </div>
            <button
              onClick={handleCadastrar}
              disabled={!valido || salvando}
              style={{ background: valido ? "var(--peach)" : "var(--line)", color: "var(--ink)", border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: valido && !salvando ? "pointer" : "not-allowed" }}
            >
              {salvando ? "Salvando…" : "Cadastrar"}
            </button>
          </div>
          {erro && <div role="alert" style={{ fontSize: 12.5, color: "var(--pink)" }}>{erro}</div>}
        </div>
      )}

      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, overflowX: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: COLS, minWidth: 980, padding: "14px 20px", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--adm-text-secondary)", letterSpacing: "0.04em", borderBottom: "1px solid var(--line)" }}>
          <div>LOJA</div><div>E-MAIL</div><div>CIDADE</div><div>SOLICITADO</div><div>STATUS</div><div>AÇÕES</div>
        </div>
        {revendedores.length === 0 ? (
          <div style={{ padding: 24, fontSize: 13, color: "var(--adm-text-secondary)" }}>Nenhum revendedor cadastrado ainda.</div>
        ) : (
          revendedores.map((r) => {
            const cor = corStatus(STATUS_LABEL[r.status]);
            const local = [r.cidade, r.uf].filter(Boolean).join("/");
            return (
              <div key={r.id} style={{ display: "grid", gridTemplateColumns: COLS, minWidth: 980, padding: "16px 20px", alignItems: "center", borderBottom: "1px solid var(--line)" }}>
                <div style={{ fontSize: 13, fontWeight: 600, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.razao_social}</div>
                <div style={{ fontSize: 12.5, color: "var(--adm-text-secondary)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.email}</div>
                <div style={{ fontSize: 13, color: "var(--adm-text-secondary)" }}>{local}</div>
                <div style={{ fontSize: 12, color: "var(--adm-text-secondary)" }}>{new Date(r.created_at).toLocaleDateString("pt-BR")}</div>
                <div>
                  {r.status === "pendente" ? (
                    <SwingTag color={cor.bg} textColor={cor.text} size="sm">Cadastro pendente</SwingTag>
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--adm-text-secondary)" }}>{STATUS_LABEL[r.status]}</span>
                  )}
                </div>
                {podeDecidir && r.status === "pendente" ? (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => onAprovar?.(r.id)} style={{ background: "var(--adm-success-bg)", border: "1px solid var(--mint)", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Aprovar</button>
                    <button onClick={() => onRecusar?.(r.id)} style={{ background: "var(--adm-pink-bg)", border: "1px solid var(--pink)", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Recusar</button>
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
