"use client";

import { useState } from "react";
import Link from "next/link";
import { BRAND } from "@/lib/brand.config";
import { useCart } from "@/lib/cart";

const NAV_LINKS = [
  { href: "/#calcados", label: "Calçados" },
  { href: "/#acessorios", label: "Acessórios" },
  { href: "/minha-conta", label: "Minha conta" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const { totalItens } = useCart();

  return (
    <>
      <div style={{ background: "var(--ink)", color: "#fff" }}>
        <div
          className="wrap"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "9px 32px",
            fontSize: 11.5,
            letterSpacing: "0.04em",
          }}
        >
          <span>{BRAND.tagline}</span>
          <span style={{ display: "flex", gap: 22, opacity: 0.9 }}>
            <Link href="/minha-conta">Minha conta</Link>
          </span>
        </div>
      </div>

      <header
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <div
          className="wrap"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "22px 32px",
            gap: 28,
          }}
        >
          <button
            aria-label="Abrir menu"
            aria-expanded={open}
            aria-controls="mobileNav"
            onClick={() => setOpen((v) => !v)}
            className="menu-btn"
            style={{
              display: "none",
              background: "none",
              border: "none",
              padding: 4,
              cursor: "pointer",
              color: "var(--ink-soft)",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--ink-soft)"
              strokeWidth={1.6}
              width={23}
              height={23}
            >
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
          <Link href="/" style={{ display: "flex", alignItems: "center" }}>
            {/* TODO: trocar por <img> quando a logo existir */}
            <span
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 24,
                letterSpacing: "0.14em",
                color: "var(--ink-soft)",
                lineHeight: 1,
              }}
            >
              {BRAND.nome}
            </span>
          </Link>
          <nav
            className="nav-main"
            style={{
              display: "flex",
              gap: 32,
              fontSize: 12.5,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              fontWeight: 500,
            }}
          >
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} style={{ color: "var(--ink)" }}>
                {l.label}
              </a>
            ))}
          </nav>
          <div style={{ display: "flex", gap: 18, color: "var(--ink-soft)", alignItems: "center" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--ink-soft)" strokeWidth={1.5} width={19} height={19} aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <Link href="/carrinho" style={{ position: "relative", display: "flex", color: "var(--ink-soft)" }} aria-label="Carrinho">
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--ink-soft)" strokeWidth={1.5} width={20} height={20}>
                <path d="M6 8h12l-1.2 11.2a1.5 1.5 0 0 1-1.5 1.3H8.7a1.5 1.5 0 0 1-1.5-1.3L6 8z" />
                <path d="M9 8V6a3 3 0 0 1 6 0v2" />
              </svg>
              {totalItens > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -7,
                    right: -8,
                    background: "var(--accent-deep)",
                    color: "#fff",
                    fontSize: 9.5,
                    fontWeight: 700,
                    borderRadius: "50%",
                    minWidth: 15,
                    height: 15,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 3px",
                  }}
                >
                  {totalItens}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      <nav
        id="mobileNav"
        className="mobile-nav"
        style={{
          display: open ? "flex" : "none",
          flexDirection: "column",
          background: "var(--surface)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        {NAV_LINKS.map((l) => (
          <a
            key={l.href}
            href={l.href}
            onClick={() => setOpen(false)}
            style={{
              padding: "15px 32px",
              fontSize: 13,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "var(--ink)",
              borderTop: "1px solid var(--line)",
              minHeight: 44,
              display: "flex",
              alignItems: "center",
            }}
          >
            {l.label}
          </a>
        ))}
      </nav>

      <style>{`
        @media (max-width: 820px) {
          .nav-main { display: none !important; }
          .menu-btn { display: flex !important; }
        }
      `}</style>
    </>
  );
}
