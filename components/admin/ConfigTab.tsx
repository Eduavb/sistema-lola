"use client";

import { useState } from "react";
import { saveConfig } from "@/app/admin/actions";

type Config = {
  taxa_entrega_local: number;
  whatsapp: string;
  cidade_taxa: string;
} | null;

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid var(--line)",
  fontSize: 13.5,
  marginBottom: 6,
};
const labelStyle: React.CSSProperties = {
  fontSize: 11.5,
  letterSpacing: "0.04em",
  color: "var(--adm-text-secondary)",
  display: "block",
  marginBottom: 6,
};
const hintStyle: React.CSSProperties = {
  fontSize: 11,
  color: "var(--adm-text-secondary)",
  marginBottom: 14,
};
const cardStyle: React.CSSProperties = {
  border: "1px solid var(--line)",
  padding: 20,
  marginBottom: 28,
  maxWidth: 560,
};
const okStyle: React.CSSProperties = {
  fontSize: 12.5,
  color: "var(--peach)",
  marginTop: 10,
};

export default function ConfigTab({
  config,
  onSaved,
  onClose,
}: {
  config: Config;
  onSaved: () => void;
  onClose?: () => void;
}) {
  const base = config ?? { taxa_entrega_local: 0, whatsapp: "", cidade_taxa: "" };

  const [taxa, setTaxa] = useState(String(base.taxa_entrega_local ?? 0));
  const [cidade, setCidade] = useState(base.cidade_taxa ?? "");
  const [whatsapp, setWhatsapp] = useState(base.whatsapp ?? "");
  const [savingConfig, setSavingConfig] = useState(false);
  const [configOk, setConfigOk] = useState(false);

  async function handleSaveConfig() {
    const taxaNum = parseFloat(taxa.replace(",", "."));
    if (isNaN(taxaNum) || taxaNum < 0) {
      alert("A taxa de entrega deve ser um número maior ou igual a zero.");
      return;
    }
    const digits = whatsapp.replace(/\D/g, "");
    setConfigOk(false);
    setSavingConfig(true);
    const { error } = await saveConfig({
      taxa_entrega_local: taxaNum,
      whatsapp: digits,
      cidade_taxa: cidade.trim(),
    });
    setSavingConfig(false);
    if (error) {
      alert(`Não deu pra salvar as configurações: ${error}`);
      return;
    }
    setWhatsapp(digits);
    setConfigOk(true);
    onSaved();
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(43,36,32,.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: 20,
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          borderRadius: 16,
          padding: 28,
          width: "100%",
          maxWidth: 560,
          maxHeight: "90vh",
          overflow: "auto",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 18,
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: 24,
              margin: 0,
            }}
          >
            Configurações
          </h2>
          <button
            onClick={() => onClose?.()}
            style={{
              background: "none",
              border: "none",
              fontSize: 18,
              color: "var(--adm-text-secondary)",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        <div style={cardStyle}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>
          Entrega e contato
        </h3>

        <label style={labelStyle}>Taxa de entrega local (R$)</label>
        <input
          type="number"
          step="0.01"
          min={0}
          style={inputStyle}
          value={taxa}
          onChange={(e) => setTaxa(e.target.value)}
        />
        <div style={hintStyle}>
          cobrada nos pedidos com entrega na cidade
        </div>

        <label style={labelStyle}>Cidade da taxa</label>
        <input
          style={inputStyle}
          value={cidade}
          onChange={(e) => setCidade(e.target.value)}
          placeholder="Ex: Belo Horizonte"
        />
        <div style={hintStyle}>
          cidade em que a taxa de entrega local se aplica
        </div>

        <label style={labelStyle}>WhatsApp</label>
        <input
          style={inputStyle}
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="5531999999999"
          inputMode="numeric"
        />
        <div style={hintStyle}>
          só dígitos, com DDI 55 e DDD (ex: 5531999999999)
        </div>

        <button
          className="btn"
          onClick={handleSaveConfig}
          disabled={savingConfig}
        >
          {savingConfig ? "Salvando…" : "Salvar"}
        </button>
        {configOk && <div style={okStyle}>Configurações salvas.</div>}
      </div>

      </div>
    </div>
  );
}
