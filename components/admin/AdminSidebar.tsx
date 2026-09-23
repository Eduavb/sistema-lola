"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  ClipboardList,
  ShoppingBag,
  Wallet,
  Users2,
  Settings,
} from "lucide-react";
import { BRAND } from "@/lib/brand.config";

export type AdminScreen =
  | "visao-geral"
  | "pedidos"
  | "produtos"
  | "financeiro"
  | "revendedores";

const NAV_ITEMS: { key: AdminScreen; label: string; Icon: typeof LayoutDashboard }[] = [
  { key: "visao-geral", label: "Visão geral", Icon: LayoutDashboard },
  { key: "pedidos", label: "Pedidos", Icon: ClipboardList },
  { key: "produtos", label: "Produtos", Icon: ShoppingBag },
  { key: "financeiro", label: "Financeiro", Icon: Wallet },
  { key: "revendedores", label: "Revendedores", Icon: Users2 },
];

export default function AdminSidebar({
  screen,
  onNavigate,
  onOpenConfig,
  onLogout,
  pendingRevendedores,
}: {
  screen: AdminScreen;
  onNavigate: (s: AdminScreen) => void;
  onOpenConfig: () => void;
  onLogout: () => void;
  pendingRevendedores: number;
}) {
  return (
    <aside
      style={{
        width: 232,
        flex: "none",
        background: "var(--surface)",
        borderRight: "1px solid var(--line)",
        display: "flex",
        flexDirection: "column",
        padding: "24px 16px",
        gap: 28,
        minHeight: "100vh",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 8px" }}>
        <Link
          href="/"
          target="_blank"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 22,
            color: "var(--ink)",
            lineHeight: 1,
          }}
        >
          {BRAND.nome}
        </Link>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.06em",
            color: "var(--adm-text-secondary)",
            textTransform: "uppercase",
          }}
        >
          admin
        </span>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.08em",
            color: "var(--adm-text-secondary)",
            padding: "8px 12px 4px",
          }}
        >
          GERAL
        </div>
        {NAV_ITEMS.map(({ key, label, Icon }) => {
          const active = screen === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onNavigate(key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 10,
                cursor: "pointer",
                border: "none",
                background: active ? "var(--adm-orange-bg)" : "transparent",
                color: active ? "var(--adm-orange-text)" : "var(--ink)",
                font: "inherit",
                textAlign: "left",
              }}
            >
              <Icon size={18} style={{ flex: "none" }} />
              <span style={{ fontSize: 14, fontWeight: 500, whiteSpace: "nowrap" }}>
                {label}
              </span>
              {key === "revendedores" && pendingRevendedores > 0 && (
                <span
                  style={{
                    marginLeft: "auto",
                    background: "var(--peach)",
                    color: "var(--ink)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    fontWeight: 600,
                    borderRadius: 10,
                    padding: "2px 7px",
                  }}
                >
                  {pendingRevendedores}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div
        style={{
          marginTop: "auto",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 12px",
          borderRadius: 12,
          background: "var(--bg)",
          border: "1px solid var(--line)",
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--pink), var(--lilac))",
            flex: "none",
          }}
        />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{BRAND.nome}</div>
          <div style={{ fontSize: 11, color: "var(--adm-text-secondary)" }}>Dona da loja</div>
        </div>
        <button
          type="button"
          onClick={onOpenConfig}
          title="Configurações"
          style={{
            flex: "none",
            width: 30,
            height: 30,
            borderRadius: 8,
            border: "1px solid var(--line)",
            background: "var(--surface)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <Settings size={16} />
        </button>
      </div>

      <button
        type="button"
        onClick={onLogout}
        style={{
          background: "none",
          border: "none",
          color: "var(--adm-text-secondary)",
          fontSize: 12,
          cursor: "pointer",
          textAlign: "left",
          padding: "0 12px",
        }}
      >
        Sair
      </button>
    </aside>
  );
}
