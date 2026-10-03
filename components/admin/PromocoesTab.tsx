"use client";

import { useEffect, useId, useState } from "react";
import type { Categoria } from "@/lib/types";
import { deletePromocao, fetchPromocoes, savePromocao } from "@/app/admin/actions";
import { confirmarDescarte, temAlteracoes } from "@/lib/admin-rascunho";
import {
  contarAtivas,
  estadoPromocao,
  notaDaPromocao,
  PROMOCAO_VAZIA,
  formatarPeriodo,
  promocaoParaForm,
  rotuloAplicaA,
  validarPromocao,
  type ErrosPromocao,
  type Promocao,
  type PromocaoForm,
} from "@/lib/admin-promocoes";
import Drawer from "./Drawer";
import Campo from "./Campo";

const COLUNAS = "1.5fr 100px 1fr 180px 150px 80px";

type Editor = { promocao: Promocao | null };

export default function PromocoesTab({
  categorias,
  onToast,
}: {
  categorias: Categoria[];
  onToast: (mensagem: string) => void;
}) {
  const [promocoes, setPromocoes] = useState<Promocao[] | null>(null);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [alternando, setAlternando] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    fetchPromocoes().then((r) => {
      if (!ativo) return;
      if (r.promocoes) setPromocoes(r.promocoes);
      else setErroCarga(r.error ?? "Não foi possível carregar as promoções.");
    });
    return () => {
      ativo = false;
    };
  }, []);

  async function recarregar() {
    const r = await fetchPromocoes();
    if (r.promocoes) setPromocoes(r.promocoes);
  }

  async function alternarAtiva(p: Promocao) {
    const { payload } = validarPromocao({ ...promocaoParaForm(p), ativa: !p.ativa });
    if (!payload) {
      onToast("Abra a promoção e corrija os dados antes de alterar o estado.");
      return;
    }
    setAlternando(p.id);
    const r = await savePromocao({ id: p.id, ...payload });
    setAlternando(null);
    if (r.error) onToast(r.error);
    else onToast(payload.ativa ? "Promoção ativada." : "Promoção desativada.");
    await recarregar();
  }

  if (erroCarga) {
    return (
      <div role="alert" className="adm-cartao">
        {erroCarga}
      </div>
    );
  }
  if (!promocoes) {
    return (
      <div className="adm-cartao" aria-busy="true">
        Carregando promoções…
      </div>
    );
  }

  const ativas = contarAtivas(promocoes);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="adm-topo">
        <div style={{ fontSize: 13, color: "var(--adm-text-secondary)" }}>
          {ativas} {ativas === 1 ? "promoção ativa" : "promoções ativas"}
        </div>
        <button type="button" className="adm-btn adm-btn-primario" onClick={() => setEditor({ promocao: null })}>
          + Criar promoção
        </button>
      </div>

      <div className="adm-tabela">
        <div className="adm-tabela-cab" style={{ gridTemplateColumns: COLUNAS, minWidth: 930 }}>
          <div>PROMOÇÃO</div>
          <div>DESCONTO</div>
          <div>APLICA A</div>
          <div>PERÍODO</div>
          <div>ATIVA</div>
          <div />
        </div>
        {promocoes.length === 0 ? (
          <div className="adm-tabela-vazia">Nenhuma promoção criada ainda.</div>
        ) : (
          promocoes.map((p) => (
            <div key={p.id} className="adm-tabela-linha" style={{ gridTemplateColumns: COLUNAS, minWidth: 930 }}>
              <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{p.nome}</div>
                {p.cupom && (
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--adm-purple-text)" }}>
                    CUPOM {p.cupom}
                  </div>
                )}
              </div>
              <div>
                <span
                  style={{
                    whiteSpace: "nowrap",
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    fontWeight: 600,
                    background: "var(--adm-orange-bg)",
                    color: "var(--adm-orange-text)",
                    borderRadius: 6,
                    padding: "3px 8px",
                  }}
                >
                  -{p.desconto_percentual}%
                </span>
              </div>
              <div style={{ fontSize: 13 }}>{rotuloAplicaA(p)}</div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  color: "var(--adm-text-secondary)",
                  whiteSpace: "nowrap",
                }}
              >
                {formatarPeriodo(p.inicio, p.fim)}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {estadoPromocao(p) === "Guardada (cupom)" && (
                  <span style={{ fontSize: 10.5, color: "var(--adm-purple-text)", lineHeight: 1.2 }}>Guardada (cupom)</span>
                )}
                <input
                  type="checkbox"
                  className="swtoggle"
                  checked={p.ativa}
                  disabled={alternando === p.id}
                  onChange={() => alternarAtiva(p)}
                  aria-label={`Promoção ${p.nome} ativa`}
                />
              </div>
              <div>
                <button type="button" className="adm-btn-mini" onClick={() => setEditor({ promocao: p })}>
                  Editar
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {editor && (
        <PromocaoDrawer
          key={editor.promocao?.id ?? "nova"}
          promocao={editor.promocao}
          categorias={categorias}
          onFechar={() => setEditor(null)}
          onConcluir={async (mensagem) => {
            setEditor(null);
            onToast(mensagem);
            await recarregar();
          }}
        />
      )}
    </div>
  );
}

function PromocaoDrawer({
  promocao,
  categorias,
  onFechar,
  onConcluir,
}: {
  promocao: Promocao | null;
  categorias: Categoria[];
  onFechar: () => void;
  onConcluir: (mensagem: string) => void | Promise<void>;
}) {
  const formId = useId();
  const [form, setForm] = useState<PromocaoForm>(promocao ? promocaoParaForm(promocao) : PROMOCAO_VAZIA);
  const [erros, setErros] = useState<ErrosPromocao>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [confirmandoExcluir, setConfirmandoExcluir] = useState(false);

  const inicial = useState(form)[0];
  const alterado = temAlteracoes(inicial, form);
  const fechar = () => {
    if (confirmarDescarte(alterado)) onFechar();
  };
  const opcoesCategoria = [...categorias].sort((a, b) => a.ordem - b.ordem);

  function alterar<K extends keyof PromocaoForm>(chave: K, valor: PromocaoForm[K]) {
    setForm((f) => ({ ...f, [chave]: valor }));
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (ocupado) return;
    const { erros: novos, payload } = validarPromocao(form);
    setErros(novos);
    setErroGeral(null);
    if (!payload) return;
    setOcupado(true);
    const r = await savePromocao({ id: promocao?.id ?? null, ...payload });
    setOcupado(false);
    if (r.error) {
      setErroGeral(r.error);
      return;
    }
    await onConcluir(promocao ? "Promoção atualizada." : "Promoção criada.");
  }

  async function excluir() {
    if (!promocao || ocupado) return;
    setOcupado(true);
    setErroGeral(null);
    const r = await deletePromocao(promocao.id);
    setOcupado(false);
    if (r.error) {
      setErroGeral(r.error);
      setConfirmandoExcluir(false);
      return;
    }
    await onConcluir("Promoção excluída.");
  }

  return (
    <Drawer
      aberto
      kicker={promocao ? "EDITAR PROMOÇÃO" : "NOVA PROMOÇÃO"}
      titulo={promocao ? promocao.nome : "Criar promoção"}
      onFechar={onFechar}
      confirmarFechar={() => confirmarDescarte(alterado)}
      rodape={
        <>
          {promocao && (
            <div className="adm-rodape-esq">
              {confirmandoExcluir ? (
                <>
                  <span role="alert" style={{ fontSize: 12.5 }}>
                    Excluir esta promoção?
                  </span>
                  <button type="button" className="adm-btn adm-btn-perigo" onClick={excluir} disabled={ocupado}>
                    Sim, excluir
                  </button>
                  <button type="button" className="adm-btn" onClick={() => setConfirmandoExcluir(false)} disabled={ocupado}>
                    Não
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="adm-btn adm-btn-perigo"
                  onClick={() => setConfirmandoExcluir(true)}
                  disabled={ocupado}
                >
                  Excluir
                </button>
              )}
            </div>
          )}
          <button type="button" className="adm-btn" onClick={fechar}>
            Cancelar
          </button>
          <button type="submit" form={formId} className="adm-btn adm-btn-primario" disabled={ocupado}>
            {ocupado ? "Salvando…" : "Salvar"}
          </button>
        </>
      }
    >
      <form id={formId} onSubmit={salvar} noValidate style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Campo rotulo="Nome da promoção *" erro={erros.nome}>
          {(p) => (
            <input
              {...p}
              className="adm-input"
              value={form.nome}
              maxLength={120}
              placeholder="Ex.: Black Friday"
              onChange={(e) => alterar("nome", e.target.value)}
            />
          )}
        </Campo>
        <Campo rotulo="Desconto (%) *" erro={erros.desconto} dica="De 1 a 90.">
          {(p) => (
            <input
              {...p}
              className="adm-input"
              inputMode="numeric"
              value={form.desconto}
              style={{ fontFamily: "var(--font-mono)" }}
              onChange={(e) => alterar("desconto", e.target.value)}
            />
          )}
        </Campo>
        <Campo rotulo="Aplica a" erro={erros.categoriaId}>
          {(p) => (
            <select
              {...p}
              className="adm-input"
              value={form.aplicaA === "loja" ? "" : form.categoriaId}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "") setForm((f) => ({ ...f, aplicaA: "loja", categoriaId: "" }));
                else setForm((f) => ({ ...f, aplicaA: "categoria", categoriaId: v }));
              }}
            >
              <option value="">Toda a loja</option>
              {opcoesCategoria.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                  {c.ativo ? "" : " (inativa)"}
                </option>
              ))}
            </select>
          )}
        </Campo>
        <div className="adm-linha-campos">
          <Campo rotulo="Início" erro={erros.inicio}>
            {(p) => (
              <input
                {...p}
                className="adm-input"
                type="date"
                value={form.inicio}
                style={{ fontFamily: "var(--font-mono)" }}
                onChange={(e) => alterar("inicio", e.target.value)}
              />
            )}
          </Campo>
          <Campo rotulo="Fim" erro={erros.fim}>
            {(p) => (
              <input
                {...p}
                className="adm-input"
                type="date"
                value={form.fim}
                min={form.inicio || undefined}
                style={{ fontFamily: "var(--font-mono)" }}
                onChange={(e) => alterar("fim", e.target.value)}
              />
            )}
          </Campo>
        </div>
        <Campo rotulo="Cupom (opcional)" erro={erros.cupom}>
          {(p) => (
            <input
              {...p}
              className="adm-input"
              value={form.cupom}
              maxLength={40}
              placeholder="EX.: LOLA10"
              autoCapitalize="characters"
              style={{ fontFamily: "var(--font-mono)" }}
              onChange={(e) => alterar("cupom", e.target.value.toUpperCase())}
            />
          )}
        </Campo>
        <p className="adm-nota" style={{ margin: 0 }}>
          {notaDaPromocao(form.cupom)}
        </p>
        <label
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, fontSize: 13, cursor: "pointer" }}
        >
          Promoção ativa
          <input
            type="checkbox"
            className="swtoggle"
            checked={form.ativa}
            onChange={(e) => alterar("ativa", e.target.checked)}
          />
        </label>
        <div aria-live="polite">
          {erroGeral && (
            <div role="alert" className="adm-erro">
              {erroGeral}
            </div>
          )}
        </div>
      </form>
    </Drawer>
  );
}
