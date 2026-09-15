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
    <header className="site-header">
      <div className="wrap site-header-pill">
        <button
          aria-label="Abrir menu"
          aria-expanded={open}
          aria-controls="mobileNav"
          onClick={() => setOpen((v) => !v)}
          className="menu-btn"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth={1.8} width={21} height={21}>
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>

        <Link href="/" className="site-logo">
          {/* TODO: trocar por <img> quando a logo existir */}
          {BRAND.nome}
        </Link>

        <nav className="nav-main" aria-label="Categorias">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="nav-link">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="site-header-actions">
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--ink-soft)" strokeWidth={1.5} width={19} height={19} aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <Link href="/carrinho" className="cart-link" aria-label="Carrinho">
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--ink-soft)" strokeWidth={1.5} width={20} height={20}>
              <path d="M6 8h12l-1.2 11.2a1.5 1.5 0 0 1-1.5 1.3H8.7a1.5 1.5 0 0 1-1.5-1.3L6 8z" />
              <path d="M9 8V6a3 3 0 0 1 6 0v2" />
            </svg>
            {totalItens > 0 && <span className="cart-badge">{totalItens}</span>}
          </Link>
        </div>
      </div>

      <nav id="mobileNav" className="mobile-nav" style={{ display: open ? "flex" : "none" }}>
        {NAV_LINKS.map((l) => (
          <a
            key={l.href}
            href={l.href}
            onClick={() => setOpen(false)}
            className="mobile-nav-link"
          >
            {l.label}
          </a>
        ))}
      </nav>

      <style>{`
        .site-header { padding: 18px 0; background: var(--bg); }
        .site-header-pill {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          background: var(--surface);
          border-radius: 999px;
          padding: 12px 22px;
          box-shadow: 0 1px 0 var(--line), 0 12px 28px -20px rgba(43,36,32,.35);
        }
        .site-logo {
          font-family: var(--font-display), sans-serif;
          font-weight: 800;
          font-size: 22px;
          letter-spacing: -0.01em;
          color: var(--ink);
          flex: none;
        }
        .nav-main { display: flex; gap: 6px; }
        .nav-link {
          font-family: var(--font-mono), monospace;
          font-size: 11px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--ink-soft);
          padding: 8px 14px;
          border-radius: 999px;
          transition: background .2s ease, color .2s ease;
        }
        .nav-link:hover, .nav-link:focus-visible {
          background: var(--pink);
          color: var(--ink);
        }
        .site-header-actions { display: flex; align-items: center; gap: 16px; flex: none; }
        .cart-link { position: relative; display: flex; }
        .cart-badge {
          position: absolute;
          top: -7px;
          right: -8px;
          background: var(--peach);
          color: var(--ink);
          font-size: 9.5px;
          font-weight: 700;
          border-radius: 50%;
          min-width: 15px;
          height: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 3px;
        }
        .menu-btn {
          display: none;
          background: none;
          border: none;
          padding: 4px;
          cursor: pointer;
        }
        .mobile-nav {
          flex-direction: column;
          background: var(--surface);
          border-radius: 18px;
          margin: 8px 20px 0;
          overflow: hidden;
          box-shadow: 0 12px 28px -20px rgba(43,36,32,.35);
        }
        .mobile-nav-link {
          padding: 15px 22px;
          font-size: 13px;
          letter-spacing: .05em;
          text-transform: uppercase;
          color: var(--ink);
          border-top: 1px solid var(--line);
          min-height: 44px;
          display: flex;
          align-items: center;
        }
        @media (max-width: 820px) {
          .nav-main { display: none !important; }
          .menu-btn { display: flex !important; }
        }
      `}</style>
    </header>
  );
}
