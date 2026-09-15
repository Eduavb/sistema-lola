"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Product, Categoria, Order, Sale } from "@/lib/types";
import { capaImagem, totalEstoque } from "@/lib/types";
import { BRAND } from "@/lib/brand.config";
import {
  logoutAdmin,
  fetchProducts,
  fetchCategorias,
  fetchOrders,
  fetchSales,
  fetchConfig,
  deleteProduct,
  setAtivo,
  setDesconto,
  setSurpresa,
} from "@/app/admin/actions";
import ProductEditor from "./ProductEditor";
import CategoriasTab from "./CategoriasTab";
import PedidosTab from "./PedidosTab";
import SalesTab from "./SalesTab";
import ConfigTab from "./ConfigTab";

type Filtro = "todos" | "varejo" | "atacado";

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Tab = "produtos" | "categorias" | "pedidos" | "financeiro" | "config";

type Config = {
  taxa_entrega_local: number;
  whatsapp: string;
  cidade_taxa: string;
} | null;

const TABS: { key: Tab; label: string }[] = [
  { key: "produtos", label: "Produtos" },
  { key: "categorias", label: "Categorias" },
  { key: "pedidos", label: "Pedidos" },
  { key: "financeiro", label: "Financeiro" },
  { key: "config", label: "Configurações" },
];

export default function AdminApp({
  initialProducts,
  initialCategorias,
  initialOrders,
  initialSales,
  initialConfig,
}: {
  initialProducts: Product[];
  initialCategorias: Categoria[];
  initialOrders: Order[];
  initialSales: Sale[];
  initialConfig: Config;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("produtos");

  const [products, setProducts] = useState(initialProducts);
  const [categorias, setCategorias] = useState(initialCategorias);
  const [orders, setOrders] = useState(initialOrders);
  const [sales, setSales] = useState(initialSales);
  const [config, setConfig] = useState<Config>(initialConfig);
  const [orderFiltro, setOrderFiltro] = useState<Filtro>("todos");
  const [salesFiltro, setSalesFiltro] = useState<Filtro>("todos");

  // Estado da aba Produtos
  // editingId: id do produto em edição, "novo" (sentinela p/ editor vazio) ou null (lista).
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [descontoOpenId, setDescontoOpenId] = useState<string | null>(null);
  const [descontoInput, setDescontoInput] = useState("");

  // As funções refresh* re-buscam os dados via server actions. As abas reais
  // das Tasks 23–26 substituem os placeholders e consomem estado + refreshers.
  async function refreshProducts(list?: Product[]) {
    setProducts(list ?? (await fetchProducts()));
  }
  async function refreshCategorias() {
    setCategorias(await fetchCategorias());
  }
  async function refreshOrders() {
    setOrders(await fetchOrders(orderFiltro));
  }
  async function refreshSales() {
    setSales(await fetchSales(salesFiltro));
  }
  async function handleOrderFiltro(f: Filtro) {
    setOrderFiltro(f);
    setOrders(await fetchOrders(f));
  }
  async function handleSalesFiltro(f: Filtro) {
    setSalesFiltro(f);
    setSales(await fetchSales(f));
  }
  async function refreshConfig() {
    setConfig(await fetchConfig());
  }

  async function handleLogout() {
    await logoutAdmin();
    router.refresh();
  }

  // --- Ações rápidas de produto ---------------------------------------------
  async function handleToggleAtivo(p: Product) {
    setBusyId(p.id);
    const { error } = await setAtivo(p.id, !p.ativo);
    if (error) alert(`Não deu pra atualizar a visibilidade: ${error}`);
    await refreshProducts();
    setBusyId(null);
  }

  async function handleToggleSurpresa(p: Product) {
    setBusyId(p.id);
    const { error } = await setSurpresa(p.id, !p.surpresa_ativo);
    if (error) alert(`Não deu pra atualizar a Live Surpresa: ${error}`);
    await refreshProducts();
    setBusyId(null);
  }

  async function handleDelete(p: Product) {
    if (
      !confirm(`Excluir "${p.nome}"? Isso apaga cores e tamanhos também.`)
    )
      return;
    setBusyId(p.id);
    const { error } = await deleteProduct(p.id);
    if (error) alert(`Não deu pra excluir: ${error}`);
    await refreshProducts();
    setBusyId(null);
  }

  function toggleDescontoRow(p: Product) {
    if (descontoOpenId === p.id) {
      setDescontoOpenId(null);
      return;
    }
    setDescontoOpenId(p.id);
    setDescontoInput(
      p.desconto_percentual != null ? String(p.desconto_percentual) : ""
    );
  }

  async function handleSalvarDesconto(id: string) {
    const raw = descontoInput.trim();
    let pct: number | null = null;
    if (raw) {
      pct = parseInt(raw, 10);
      if (isNaN(pct) || pct < 1 || pct > 99) {
        alert("O desconto deve ser um número entre 1 e 99.");
        return;
      }
    }
    setBusyId(id);
    const { error } = await setDesconto(id, pct);
    if (error) alert(`Não deu pra salvar o desconto: ${error}`);
    await refreshProducts();
    setBusyId(null);
    setDescontoOpenId(null);
  }

  // Limpa o desconto direto — não depende de setState no mesmo tick.
  async function handleRemoverDesconto(id: string) {
    setBusyId(id);
    const { error } = await setDesconto(id, null);
    if (error) alert(`Não deu pra remover o desconto: ${error}`);
    else await refreshProducts();
    setBusyId(null);
    setDescontoOpenId(null);
  }

  const produtoEmEdicao =
    editingId === "novo"
      ? null
      : products.find((p) => p.id === editingId) ?? null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <header
        style={{
          background: "var(--ink)",
          color: "#fff",
          padding: "18px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 20 }}>
          {`Painel ${BRAND.nome}`}
        </div>
        <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
          <nav style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  background: tab === t.key ? "rgba(255,255,255,.15)" : "transparent",
                  border: "none",
                  color: "#fff",
                  padding: "8px 16px",
                  fontSize: 13,
                  cursor: "pointer",
                  letterSpacing: "0.03em",
                }}
              >
                {t.label}
              </button>
            ))}
          </nav>
          <a href="/" target="_blank" style={{ fontSize: 12, color: "rgba(255,255,255,.75)" }}>
            Ver site ↗
          </a>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,.75)",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Sair
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 24px" }}>
        {tab === "produtos" ? (
          editingId !== null ? (
            <ProductEditor
              product={produtoEmEdicao}
              categorias={categorias}
              onChange={refreshProducts}
              onDone={async () => {
                setEditingId(null);
                await refreshProducts();
              }}
            />
          ) : (
            <>
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
                  Produtos ({products.length})
                </h2>
                <button className="btn" onClick={() => setEditingId("novo")}>
                  + Novo produto
                </button>
              </div>

              {products.length === 0 ? (
                <p style={{ color: "var(--muted)", fontSize: 13.5 }}>
                  Nenhum produto cadastrado ainda. Clique em &quot;Novo
                  produto&quot; pra começar.
                </p>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                    background: "var(--line)",
                  }}
                >
                  {products.map((p) => {
                    const estoque = totalEstoque(p);
                    const capa = capaImagem(p);
                    const busy = busyId === p.id;
                    return (
                      <div key={p.id} style={{ background: "var(--surface)" }}>
                        <div
                          style={{
                            padding: "14px 18px",
                            display: "flex",
                            alignItems: "center",
                            gap: 16,
                            flexWrap: "wrap",
                          }}
                        >
                          <button
                            onClick={() => setEditingId(p.id)}
                            title="Abrir produto"
                            style={{
                              width: 46,
                              height: 46,
                              background: "var(--surface-muted)",
                              flex: "none",
                              overflow: "hidden",
                              border: "none",
                              padding: 0,
                              cursor: "pointer",
                            }}
                          >
                            {capa && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={capa}
                                alt=""
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                }}
                              />
                            )}
                          </button>
                          <div style={{ flex: 1, minWidth: 180 }}>
                            <div style={{ fontSize: 14, fontWeight: 600 }}>
                              {p.nome}{" "}
                              {!p.ativo && (
                                <span
                                  style={{
                                    fontSize: 10.5,
                                    color: "var(--muted)",
                                    fontWeight: 400,
                                  }}
                                >
                                  (oculto da vitrine)
                                </span>
                              )}
                              {p.destaque && (
                                <span
                                  style={{
                                    fontSize: 10.5,
                                    color: "var(--accent)",
                                    fontWeight: 400,
                                  }}
                                >
                                  {" "}
                                  ★ destaque
                                </span>
                              )}
                              {p.surpresa_ativo && (
                                <span
                                  style={{
                                    fontSize: 10.5,
                                    color: "var(--accent)",
                                    fontWeight: 600,
                                  }}
                                >
                                  {" "}
                                  🎁 na live
                                </span>
                              )}
                              {p.desconto_percentual != null && (
                                <span
                                  style={{
                                    fontSize: 10.5,
                                    color: "#b23b3b",
                                    fontWeight: 600,
                                  }}
                                >
                                  {" "}
                                  🏷️ -{p.desconto_percentual}%
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 12, color: "var(--muted)" }}>
                              {p.categoria?.nome ?? "sem categoria"} ·{" "}
                              {p.colors?.length ?? 0} cor(es) ·{" "}
                              {p.desconto_percentual != null ? (
                                <>
                                  <span style={{ textDecoration: "line-through" }}>
                                    {brl(p.preco)}
                                  </span>{" "}
                                  <strong style={{ color: "#b23b3b" }}>
                                    {brl(
                                      p.preco *
                                        (1 - p.desconto_percentual / 100)
                                    )}
                                  </strong>
                                </>
                              ) : (
                                brl(p.preco)
                              )}
                            </div>
                          </div>

                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color:
                                estoque === 0
                                  ? "#b23b3b"
                                  : estoque < 5
                                    ? "var(--accent)"
                                    : "var(--accent)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {estoque} em estoque
                          </span>

                          <button
                            onClick={() => handleToggleAtivo(p)}
                            disabled={busy}
                            title={
                              p.ativo
                                ? "Ocultar da vitrine (arquivar sem excluir)"
                                : "Tornar visível na vitrine"
                            }
                            style={{
                              border: p.ativo
                                ? "1px solid var(--line)"
                                : "1px solid var(--accent)",
                              background: p.ativo ? "none" : "var(--accent)",
                              color: p.ativo ? "var(--muted)" : "#fff",
                              padding: "8px 12px",
                              fontSize: 12,
                              cursor: busy ? "wait" : "pointer",
                              opacity: busy ? 0.6 : 1,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {p.ativo ? "👁 Visível" : "🚫 Oculto"}
                          </button>

                          <button
                            onClick={() => toggleDescontoRow(p)}
                            title="Definir desconto de varejo"
                            style={{
                              border:
                                p.desconto_percentual != null
                                  ? "1px solid #b23b3b"
                                  : "1px solid var(--line)",
                              background:
                                p.desconto_percentual != null
                                  ? "#b23b3b"
                                  : "none",
                              color:
                                p.desconto_percentual != null
                                  ? "#fff"
                                  : "var(--muted)",
                              padding: "8px 12px",
                              fontSize: 12,
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {p.desconto_percentual != null
                              ? `🏷️ -${p.desconto_percentual}%`
                              : "% Desconto"}
                          </button>

                          <button
                            onClick={() => handleToggleSurpresa(p)}
                            disabled={busy}
                            title={
                              p.surpresa_ativo
                                ? "Desativar da Live Surpresa"
                                : "Ativar na Live Surpresa (desativa os demais)"
                            }
                            style={{
                              border: p.surpresa_ativo
                                ? "1px solid var(--accent)"
                                : "1px solid var(--line)",
                              background: p.surpresa_ativo
                                ? "var(--accent)"
                                : "none",
                              color: p.surpresa_ativo ? "#fff" : "var(--muted)",
                              padding: "8px 12px",
                              fontSize: 12,
                              cursor: busy ? "wait" : "pointer",
                              opacity: busy ? 0.6 : 1,
                              whiteSpace: "nowrap",
                            }}
                          >
                            🎁 {p.surpresa_ativo ? "Ativado" : "Desativado"}
                          </button>

                          <button
                            onClick={() => setEditingId(p.id)}
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
                            onClick={() => handleDelete(p)}
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

                        {descontoOpenId === p.id && (
                          <div
                            style={{
                              padding: "0 18px 16px 80px",
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              flexWrap: "wrap",
                            }}
                          >
                            <label
                              style={{ fontSize: 12, color: "var(--muted)" }}
                            >
                              Desconto (%):
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={99}
                              value={descontoInput}
                              onChange={(e) => setDescontoInput(e.target.value)}
                              placeholder="Ex: 30"
                              style={{
                                width: 80,
                                padding: "6px 8px",
                                border: "1px solid var(--line)",
                                fontSize: 12.5,
                              }}
                            />
                            <button
                              onClick={() => handleSalvarDesconto(p.id)}
                              disabled={busy}
                              className="btn"
                              style={{ padding: "7px 14px", fontSize: 12 }}
                            >
                              {busy ? "Salvando…" : "Salvar"}
                            </button>
                            {p.desconto_percentual != null && (
                              <button
                                onClick={() => handleRemoverDesconto(p.id)}
                                disabled={busy}
                                style={{
                                  background: "none",
                                  border: "1px solid var(--line)",
                                  padding: "7px 14px",
                                  fontSize: 12,
                                  cursor: "pointer",
                                }}
                              >
                                Remover
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )
        ) : tab === "categorias" ? (
          <CategoriasTab categorias={categorias} onChange={refreshCategorias} />
        ) : tab === "pedidos" ? (
          <PedidosTab
            orders={orders}
            filtro={orderFiltro}
            onFiltro={handleOrderFiltro}
            onChange={refreshOrders}
          />
        ) : tab === "financeiro" ? (
          <SalesTab
            products={products}
            sales={sales}
            filtro={salesFiltro}
            onFiltro={handleSalesFiltro}
            onChange={refreshSales}
          />
        ) : (
          <ConfigTab config={config} onSaved={refreshConfig} />
        )}
      </div>
    </div>
  );
}
