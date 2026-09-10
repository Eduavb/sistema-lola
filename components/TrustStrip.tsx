import type { CSSProperties } from "react";
import { BRAND } from "@/lib/brand.config";

const ITEMS = [
  {
    icon: <path d="M3 12l7-7 7 7M6 10.5V20h12v-9.5" />,
    t1: BRAND.nome,
    t2: "Calçados e acessórios",
  },
  {
    icon: (
      <>
        <rect x="3" y="6" width="18" height="13" rx="1.5" />
        <path d="M3 10h18M8 6V4h8v2" />
      </>
    ),
    t1: "Pix ou cartão",
    t2: "Pagamento pelo Mercado Pago",
  },
  {
    icon: <path d="M12 3l7 3.5v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9v-5L12 3z" />,
    t1: "Compra segura",
    t2: "Checkout oficial Mercado Pago",
  },
  {
    icon: <path d="M21 11.5a8.5 8.5 0 10-3.8 7.1L21 20l-1.2-3.6c.8-1.2 1.2-2.6 1.2-4.9z" />,
    t1: "Atendimento",
    t2: "Fale com a gente no WhatsApp",
    href: BRAND.whatsappUrl,
  },
];

export default function TrustStrip() {
  return (
    <section style={{ borderBottom: "1px solid var(--line)", background: "var(--surface)" }}>
      <div
        className="wrap trust-grid"
        style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", padding: "26px 32px" }}
      >
        {ITEMS.map((it, i) => {
          const itemStyle: CSSProperties = {
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "0 18px",
            borderLeft: i === 0 ? "none" : "1px solid var(--line)",
            color: "inherit",
            textDecoration: "none",
          };
          const content = (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--navy)" strokeWidth={1.4} width={26} height={26}>
                {it.icon}
              </svg>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: "0.02em" }}>{it.t1}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{it.t2}</div>
              </div>
            </>
          );
          return it.href ? (
            <a key={i} href={it.href} target="_blank" rel="noopener noreferrer" className="trust-item" style={itemStyle}>
              {content}
            </a>
          ) : (
            <div key={i} className="trust-item" style={itemStyle}>
              {content}
            </div>
          );
        })}
      </div>
      <style>{`
        @media (max-width: 820px) {
          .trust-grid { grid-template-columns: repeat(2,1fr) !important; row-gap: 20px; }
          .trust-item:nth-child(odd) { border-left: none !important; padding-left: 0 !important; }
        }
        @media (max-width: 520px) {
          .trust-grid { grid-template-columns: 1fr !important; }
          .trust-item { border-left: none !important; padding-left: 0 !important; }
        }
      `}</style>
    </section>
  );
}
