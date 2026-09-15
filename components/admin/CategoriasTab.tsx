"use client";

import { useState } from "react";
import type { Categoria } from "@/lib/types";
import { slugify } from "@/lib/types";
import { saveCategoria, deleteCategoria } from "@/app/admin/actions";

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

const GRUPO_LABEL: Record<Categoria["grupo"], string> = {
  calcados: "Calçados",
  acessorios: "Acessórios",
};

type FormState = {
  id: string | null;
  grupo: "calcados" | "acessorios";
  nome: string;
  slug: string;
  ordem: string;
  ativo: boolean;
  desconto: string;
};

const EMPTY_FORM: FormState = {
  id: null,
  grupo: "calcados",
  nome: "",
  slug: "",
  ordem: "0",
  ativo: true,
  desconto: "",
};

function fromCategoria(c: Categoria): FormState {
  return {
    id: c.id,
    grupo: c.grupo,
    nome: c.nome,
    slug: c.slug,
    ordem: String(c.ordem),
    ativo: c.ativo,
    desconto:
      c.desconto_atacado_percentual != null
        ? String(c.desconto_atacado_percentual)
        : "",
  };
}

export default function CategoriasTab({
  categorias,
  onChange,
}: {
  categorias: Categoria[];
  onChange: () => void;
}) {
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const grupos: Categoria["grupo"][] = ["calcados", "acessorios"];

  function openNova() {
    setForm({ ...EMPTY_FORM });
  }

  function openEditar(c: Categoria) {
    setForm(fromCategoria(c));
  }

  function fecharForm() {
    setForm(null);
  }

  async function handleSave() {
    if (!form) return;
    if (!form.nome.trim()) {
      alert("Informe o nome da categoria.");
      return;
    }
    const ordemNum = parseInt(form.ordem, 10);
    if (isNaN(ordemNum) || ordemNum < 0) {
      alert("A ordem deve ser um número maior ou igual a zero.");
      return;
    }
    let desconto: number | null = null;
    if (form.desconto.trim()) {
      desconto = parseInt(form.desconto.trim(), 10);
      if (isNaN(desconto) || desconto < 0 || desconto > 100) {
        alert("O desconto de atacado deve ser um número entre 0 e 100.");
        return;
      }
    }
    const slug = form.slug.trim() || slugify(form.nome);
    setSaving(true);
    const { error } = await saveCategoria({
      id: form.id,
      grupo: form.grupo,
      nome: form.nome.trim(),
      slug,
      ordem: ordemNum,
      ativo: form.ativo,
      desconto_atacado_percentual: desconto,
    });
    setSaving(false);
    if (error) {
      alert(`Não deu pra salvar a categoria: ${error}`);
      return;
    }
    setForm(null);
    onChange();
  }

  async function handleDelete(c: Categoria) {
    if (!confirm(`Excluir a categoria "${c.nome}"?`)) return;
    setBusyId(c.id);
    const { error } = await deleteCategoria(c.id);
    setBusyId(null);
    if (error) {
      alert(error);
      return;
    }
    onChange();
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 22,
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 24,
          }}
        >
          Categorias ({categorias.length})
        </h2>
        {!form && (
          <button className="btn" onClick={openNova}>
            + Nova categoria
          </button>
        )}
      </div>

      {form && (
        <div
          style={{
            border: "1px solid var(--ink-soft)",
            padding: 20,
            marginBottom: 28,
          }}
        >
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>
            {form.id ? "Editar categoria" : "Nova categoria"}
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 20,
            }}
          >
            <div>
              <label style={labelStyle}>Grupo</label>
              <select
                style={inputStyle}
                value={form.grupo}
                onChange={(e) =>
                  setForm({
                    ...form,
                    grupo: e.target.value as "calcados" | "acessorios",
                  })
                }
              >
                <option value="calcados">Calçados</option>
                <option value="acessorios">Acessórios</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Nome</label>
              <input
                style={inputStyle}
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex: Bota"
              />
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 20,
            }}
          >
            <div>
              <label style={labelStyle}>Slug (opcional)</label>
              <input
                style={inputStyle}
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="deixe vazio para gerar do nome"
              />
              <div style={hintStyle}>
                gerado automaticamente do nome quando em branco
              </div>
            </div>
            <div>
              <label style={labelStyle}>Ordem</label>
              <input
                type="number"
                min={0}
                style={inputStyle}
                value={form.ordem}
                onChange={(e) => setForm({ ...form, ordem: e.target.value })}
              />
              <div style={hintStyle}>menor aparece primeiro na vitrine</div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 20,
            }}
          >
            <div>
              <label style={labelStyle}>
                Desconto de atacado (%, opcional)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                style={inputStyle}
                value={form.desconto}
                onChange={(e) =>
                  setForm({ ...form, desconto: e.target.value })
                }
                placeholder="Ex: 30"
              />
              <div style={hintStyle}>usado no preço de atacado (Fase 3)</div>
            </div>
          </div>

          <label
            style={{
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 20,
            }}
          >
            <input
              type="checkbox"
              checked={form.ativo}
              onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
            />{" "}
            Ativa
          </label>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Salvando…" : form.id ? "Salvar alterações" : "Criar categoria"}
            </button>
            <button
              onClick={fecharForm}
              style={{
                background: "none",
                border: "none",
                color: "var(--muted)",
                fontSize: 12.5,
                cursor: "pointer",
              }}
            >
              cancelar
            </button>
          </div>
        </div>
      )}

      {categorias.length === 0 ? (
        <p style={{ color: "var(--muted)", fontSize: 13.5 }}>
          Nenhuma categoria cadastrada ainda.
        </p>
      ) : (
        grupos.map((grupo) => {
          const doGrupo = categorias
            .filter((c) => c.grupo === grupo)
            .sort((a, b) => a.ordem - b.ordem);
          if (doGrupo.length === 0) return null;
          return (
            <div key={grupo} style={{ marginBottom: 28 }}>
              <h3
                style={{
                  fontSize: 13,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--muted)",
                  marginBottom: 10,
                }}
              >
                {GRUPO_LABEL[grupo]}
              </h3>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  background: "var(--line)",
                }}
              >
                {doGrupo.map((c) => {
                  const busy = busyId === c.id;
                  return (
                    <div
                      key={c.id}
                      style={{
                        background: "var(--surface)",
                        padding: "14px 18px",
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>
                          {c.nome}{" "}
                          {!c.ativo && (
                            <span
                              style={{
                                fontSize: 10.5,
                                color: "var(--muted)",
                                fontWeight: 400,
                              }}
                            >
                              (inativa)
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>
                          /{c.slug} · ordem {c.ordem} · ativa:{" "}
                          {c.ativo ? "sim" : "não"} · atacado:{" "}
                          {c.desconto_atacado_percentual != null
                            ? `${c.desconto_atacado_percentual}%`
                            : "—"}
                        </div>
                      </div>
                      <button
                        onClick={() => openEditar(c)}
                        disabled={busy}
                        style={{
                          background: "none",
                          border: "1px solid var(--line)",
                          padding: "8px 14px",
                          fontSize: 12,
                          cursor: "pointer",
                        }}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(c)}
                        disabled={busy}
                        style={{
                          background: "none",
                          border: "1px solid var(--line)",
                          padding: "8px 14px",
                          fontSize: 12,
                          cursor: busy ? "wait" : "pointer",
                          color: "#b23b3b",
                        }}
                      >
                        Excluir
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
