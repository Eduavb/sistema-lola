"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  ClipboardList,
  ShoppingBag,
  Wallet,
  Users2,
  Settings,
  ImageIcon,
  Type,
  Percent,
  UserCog,
} from "lucide-react";
import { BRAND } from "@/lib/brand.config";
import { rotuloPapel, type AdminScreen } from "@/lib/admin-acesso";
import type { Papel } from "@/lib/roles";

export type { AdminScreen } from "@/lib/admin-acesso";

type ItemNav = { key: AdminScreen; label: string; Icon: typeof LayoutDashboard };

const GRUPOS: { rotulo: string; itens: ItemNav[] }[] = [
  {
    rotulo: "Geral",
    itens: [
      { key: "visao-geral", label: "Visão geral", Icon: LayoutDashboard },
      { key: "pedidos", label: "Pedidos", Icon: ClipboardList },
      { key: "financeiro", label: "Financeiro", Icon: Wallet },
    ],
  },
  {
    rotulo: "Catálogo",
    itens: [
      { key: "produtos", label: "Produtos", Icon: ShoppingBag },
      { key: "promocoes", label: "Promoções", Icon: Percent },
    ],
  },
  {
    rotulo: "Aparência",
    itens: [
      { key: "banner", label: "Banner do hero", Icon: ImageIcon },
      { key: "textos", label: "Textos da loja", Icon: Type },
    ],
  },
  {
    rotulo: "Pessoas",
    itens: [
      { key: "revendedores", label: "Revendedores", Icon: Users2 },
      { key: "usuarios", label: "Usuários", Icon: UserCog },
    ],
  },
];

export default function AdminSidebar({
  screen,
  screens,
  perfil,
  onNavigate,
  onOpenConfig,
  onLogout,
  pendingRevendedores,
}: {
  screen: AdminScreen;
  screens: AdminScreen[];
  perfil: { nome: string; papel: Papel };
  onNavigate: (s: AdminScreen) => void;
  onOpenConfig?: () => void;
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
        gap: 20,
        minHeight: "100vh",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 8px" }}>
        <Link href="/" target="_blank" aria-label={BRAND.nome} style={{ display: "flex", alignItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/lola-logo.png" alt={BRAND.nome} style={{ height: 24, width: "auto", display: "block" }} />
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

      <nav aria-label="Seções do admin" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {GRUPOS.map((grupo) => {
          const itens = grupo.itens.filter(({ key }) => screens.includes(key));
          if (itens.length === 0) return null;
          return (
            <div
              key={grupo.rotulo}
              role="group"
              aria-label={grupo.rotulo}
              style={{ display: "flex", flexDirection: "column", gap: 2 }}
            >
              <div
                aria-hidden="true"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  color: "var(--adm-text-secondary)",
                  padding: "12px 12px 4px",
                }}
              >
                {grupo.rotulo.toUpperCase()}
              </div>
              {itens.map(({ key, label, Icon }) => {
                const active = screen === key;
                return (
                  <button
                    key={key}
                    type="button"
                    className="adm-nav-item"
                    aria-current={active ? "page" : undefined}
                    onClick={() => onNavigate(key)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      borderRadius: 10,
                      cursor: "pointer",
                      border: "none",
                      borderLeft: active ? "3px solid var(--brand-orange)" : "3px solid transparent",
                      background: active ? "var(--adm-orange-bg)" : "transparent",
                      color: active ? "var(--adm-orange-text)" : "var(--ink)",
                      font: "inherit",
                      textAlign: "left",
                    }}
                  >
                    <Icon size={18} style={{ flex: "none" }} />
                    <span style={{ fontSize: 14, fontWeight: 500, whiteSpace: "nowrap" }}>{label}</span>
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
            </div>
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
            background: "linear-gradient(135deg, var(--brand-magenta), var(--brand-orange))",
            flex: "none",
          }}
        />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
          >
            {perfil.nome}
          </div>
          <div style={{ fontSize: 11, color: "var(--adm-text-secondary)" }}>{rotuloPapel(perfil.papel)}</div>
        </div>
        {onOpenConfig && (
          <button
            type="button"
            className="adm-btn"
            onClick={onOpenConfig}
            title="Configurações"
            aria-label="Configurações"
            style={{
              flex: "none",
              width: 30,
              height: 30,
              padding: 0,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Settings size={16} />
          </button>
        )}
      </div>

      <button
        type="button"
        className="adm-nav-item"
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
