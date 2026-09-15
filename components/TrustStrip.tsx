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
    <section className="trust-strip">
      <div className="wrap trust-grid">
        {ITEMS.map((it, i) => {
          const content = (
            <>
              <span className="trust-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth={1.4} width={22} height={22}>
                  {it.icon}
                </svg>
              </span>
              <div>
                <div className="trust-t1">{it.t1}</div>
                <div className="trust-t2">{it.t2}</div>
              </div>
            </>
          );
          const itemStyle: CSSProperties = { color: "inherit", textDecoration: "none" };
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
        .trust-strip { background: var(--bg); padding: 8px 0 28px; }
        .trust-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
        }
        .trust-item {
          display: flex;
          align-items: center;
          gap: 12px;
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 16px;
          padding: 14px 16px;
        }
        .trust-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--peach);
          flex: none;
        }
        .trust-t1 { font-size: 12.5px; font-weight: 700; letter-spacing: 0.02em; }
        .trust-t2 { font-size: 11px; color: var(--muted); margin-top: 2px; }
        @media (max-width: 820px) {
          .trust-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 520px) {
          .trust-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </section>
  );
}
