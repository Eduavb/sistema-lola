"use client";

import { useEffect, useId, useState } from "react";
import { fetchTextos, saveTextos } from "@/app/admin/actions";
import {
  GRUPOS_TEXTOS,
  LIMITE_TEXTO,
  apenasAlteradas,
  chavesAlteradas,
  validarLinkTexto,
  type CampoTexto,
} from "@/lib/admin-textos";

function Campo({
  campo,
  valor,
  erro,
  onChange,
}: {
  campo: CampoTexto;
  valor: string;
  erro: string | null;
  onChange: (v: string) => void;
}) {
  const id = useId();
  const dicaId = `${id}-dica`;
  const erroId = `${id}-erro`;

  if (campo.tipo === "toggle") {
    return (
      <label
        htmlFor={id}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        {campo.rotulo}
        <input
          id={id}
          type="checkbox"
          className="swtoggle"
          checked={valor === "true"}
          onChange={(e) => onChange(e.target.checked ? "true" : "false")}
        />
      </label>
    );
  }

  const descritoPor = [campo.dica ? dicaId : "", erro ? erroId : ""].filter(Boolean).join(" ") || undefined;
  const comum = {
    id,
    className: "adm-input",
    value: valor,
    maxLength: LIMITE_TEXTO,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
    "aria-invalid": erro ? true : undefined,
    "aria-describedby": descritoPor,
  };

  return (
    <div className="adm-campo">
      <label htmlFor={id} className="adm-rotulo">
        {campo.rotulo}
      </label>
      {campo.tipo === "area" ? (
        <textarea {...comum} rows={3} style={{ resize: "vertical" }} />
      ) : (
        <input {...comum} type="text" />
      )}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {campo.dica && (
            <span id={dicaId} className="adm-dica">
              {campo.dica}
            </span>
          )}
          {erro && (
            <span id={erroId} className="adm-erro">
              {erro}
            </span>
          )}
        </div>
        <span className="adm-contador" data-cheio={valor.length >= LIMITE_TEXTO}>
          {valor.length}/{LIMITE_TEXTO}
        </span>
      </div>
    </div>
  );
}

export default function TextosTab({ onToast }: { onToast: (mensagem: string) => void }) {
  const [base, setBase] = useState<Record<string, string> | null>(null);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let ativo = true;
    fetchTextos().then((r) => {
      if (!ativo) return;
      if (r.valores) {
        setBase(r.valores);
        setValores(r.valores);
      } else {
        setErroCarga(r.error ?? "Não foi possível carregar os textos.");
      }
    });
    return () => {
      ativo = false;
    };
  }, []);

  if (erroCarga) {
    return (
      <p role="alert" className="adm-erro" style={{ fontSize: 13 }}>
        {erroCarga}
      </p>
    );
  }
  if (!base) {
    return (
      <p role="status" style={{ fontSize: 13, color: "var(--adm-text-secondary)" }}>
        Carregando textos...
      </p>
    );
  }

  const alteradas = chavesAlteradas(valores, base);
  const errosLink: Record<string, string | null> = {};
  for (const g of GRUPOS_TEXTOS)
    for (const c of g.campos)
      if (c.tipo === "link") errosLink[c.chave] = validarLinkTexto(valores[c.chave] ?? "");
  const temErroLink = Object.values(errosLink).some(Boolean);

  async function salvar() {
    if (!base) return;
    setErroSalvar(null);
    setSalvando(true);
    const { error } = await saveTextos(apenasAlteradas(valores, base));
    setSalvando(false);
    if (error) {
      setErroSalvar(error);
      return;
    }
    setBase({ ...valores });
    onToast("Textos salvos");
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (alteradas.length > 0 && !temErroLink && !salvando) salvar();
      }}
      style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 720 }}
    >
      <p style={{ fontSize: 13, color: "var(--adm-text-secondary)", margin: 0 }}>
        Campos de texto deixados em branco voltam ao texto padrão da loja.
      </p>
      {GRUPOS_TEXTOS.map((grupo) => (
        <fieldset key={grupo.id} className="adm-cartao" style={{ margin: 0 }}>
          <legend className="adm-grupo-titulo" style={{ padding: "0 6px" }}>
            {grupo.titulo}
          </legend>
          {grupo.campos.map((campo) => (
            <Campo
              key={campo.chave}
              campo={campo}
              valor={valores[campo.chave] ?? ""}
              erro={errosLink[campo.chave] ?? null}
              onChange={(v) => setValores((atual) => ({ ...atual, [campo.chave]: v }))}
            />
          ))}
        </fieldset>
      ))}
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <button
          type="submit"
          className="adm-btn adm-btn-primario"
          disabled={alteradas.length === 0 || temErroLink || salvando}
        >
          {salvando ? "Salvando..." : "Salvar textos"}
        </button>
        {alteradas.length > 0 && !salvando && (
          <span style={{ fontSize: 12, color: "var(--adm-text-secondary)" }}>
            {alteradas.length === 1 ? "1 texto alterado" : `${alteradas.length} textos alterados`}
          </span>
        )}
        {erroSalvar && (
          <span role="alert" className="adm-erro">
            {erroSalvar}
          </span>
        )}
      </div>
    </form>
  );
}
