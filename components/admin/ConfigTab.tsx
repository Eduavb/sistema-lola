"use client";

import { useState } from "react";
import { saveConfig, changePassword } from "@/app/admin/actions";

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
  color: "var(--muted)",
  display: "block",
  marginBottom: 6,
};
const hintStyle: React.CSSProperties = {
  fontSize: 11,
  color: "var(--muted)",
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
  color: "var(--navy)",
  marginTop: 10,
};

export default function ConfigTab({
  config,
  onSaved,
}: {
  config: Config;
  onSaved: () => void;
}) {
  const base = config ?? { taxa_entrega_local: 0, whatsapp: "", cidade_taxa: "" };

  const [taxa, setTaxa] = useState(String(base.taxa_entrega_local ?? 0));
  const [cidade, setCidade] = useState(base.cidade_taxa ?? "");
  const [whatsapp, setWhatsapp] = useState(base.whatsapp ?? "");
  const [savingConfig, setSavingConfig] = useState(false);
  const [configOk, setConfigOk] = useState(false);

  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirma, setConfirma] = useState("");
  const [trocando, setTrocando] = useState(false);
  const [senhaOk, setSenhaOk] = useState(false);

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

  async function handleChangePassword() {
    if (nova.length < 12) {
      alert("A nova senha precisa ter ao menos 12 caracteres.");
      return;
    }
    if (nova !== confirma) {
      alert("A confirmação não confere com a nova senha.");
      return;
    }
    setSenhaOk(false);
    setTrocando(true);
    const { error } = await changePassword(atual, nova);
    setTrocando(false);
    if (error) {
      alert(error);
      return;
    }
    setAtual("");
    setNova("");
    setConfirma("");
    setSenhaOk(true);
  }

  return (
    <div>
      <h2
        style={{
          fontFamily: "var(--font-playfair)",
          fontStyle: "italic",
          fontSize: 24,
          marginBottom: 22,
        }}
      >
        Configurações
      </h2>

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

      <div style={cardStyle}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>
          Trocar senha
        </h3>

        <label style={labelStyle}>Senha atual</label>
        <input
          type="password"
          style={inputStyle}
          value={atual}
          onChange={(e) => setAtual(e.target.value)}
          autoComplete="current-password"
        />
        <div style={{ marginBottom: 8 }} />

        <label style={labelStyle}>Nova senha</label>
        <input
          type="password"
          style={inputStyle}
          value={nova}
          onChange={(e) => setNova(e.target.value)}
          autoComplete="new-password"
        />
        <div style={hintStyle}>ao menos 12 caracteres</div>

        <label style={labelStyle}>Confirmar nova senha</label>
        <input
          type="password"
          style={inputStyle}
          value={confirma}
          onChange={(e) => setConfirma(e.target.value)}
          autoComplete="new-password"
        />
        <div style={{ marginBottom: 8 }} />

        <button
          className="btn"
          onClick={handleChangePassword}
          disabled={trocando}
        >
          {trocando ? "Trocando…" : "Trocar"}
        </button>
        {senhaOk && (
          <div style={okStyle}>Senha alterada. Você continua logado.</div>
        )}
      </div>
    </div>
  );
}
