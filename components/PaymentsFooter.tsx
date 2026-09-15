import Link from "next/link";
import { BRAND } from "@/lib/brand.config";

export function PaymentsStrip() {
  return (
    <div className="payments">
      <div className="wrap">
        <span className="item">Pix</span>
        <span className="item">Cartão de crédito</span>
        <span className="item">Checkout Mercado Pago</span>
      </div>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer style={{ padding: "56px 0 40px" }} id="sobre">
      <div className="wrap">
        <div
          className="footer-grid"
          style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 40, marginBottom: 40 }}
        >
          <div>
            {/* TODO: trocar por <img> quando a logo existir */}
            <span
              style={{
                display: "block",
                fontFamily: "var(--font-display), sans-serif",
                fontSize: 20,
                letterSpacing: "0.14em",
                color: "var(--ink-soft)",
                marginBottom: 14,
              }}
            >
              {BRAND.nome}
            </span>
            <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, maxWidth: "34ch", margin: 0 }}>
              {`${BRAND.nome} — ${BRAND.tagline}.`}
            </p>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                marginTop: 16,
                padding: "9px 14px",
                border: "1px solid var(--line)",
                borderRadius: 7,
                background: "#fff",
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--ink-soft)" strokeWidth={1.4} width={16} height={16} style={{ flex: "none" }}>
                <path d="M12 3l7 3.5v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9v-5L12 3z" />
              </svg>
              <span style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.3 }}>
                Compra segura
                <br />
                Parceria oficial{" "}
                <span style={{ fontWeight: 800, color: "#009ee3" }}>
                  mercado<span style={{ color: "#2d3277" }}>pago</span>
                </span>
              </span>
            </div>
          </div>
          <div>
            <h4 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>
              Coleção
            </h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10, fontSize: 13.5, color: "var(--muted)" }}>
              <li><Link href="/#calcados">Calçados</Link></li>
              <li><Link href="/#acessorios">Acessórios</Link></li>
            </ul>
          </div>
          <div>
            <h4 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>
              Atendimento
            </h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10, fontSize: 13.5, color: "var(--muted)" }}>
              <li><a href={BRAND.whatsappUrl} target="_blank" rel="noopener noreferrer">WhatsApp</a></li>
              {BRAND.instagramUrl && (
                <li><a href={BRAND.instagramUrl} target="_blank" rel="noopener noreferrer">Instagram</a></li>
              )}
              <li>Trocas e dúvidas</li>
            </ul>
          </div>
        </div>
        <div className="footer-wordmark" aria-hidden="true">
          {BRAND.nome}
        </div>
        <div
          style={{
            borderTop: "1px solid var(--line)",
            paddingTop: 22,
            display: "flex",
            justifyContent: "space-between",
            fontSize: 12,
            color: "var(--muted)",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <span>{`© ${new Date().getFullYear()} ${BRAND.nome}`}</span>
        </div>
      </div>
      <style>{`
        .footer-wordmark {
          font-family: var(--font-display), sans-serif;
          font-weight: 800;
          font-size: var(--fs-wordmark);
          line-height: 0.85;
          text-align: center;
          color: var(--ink);
          opacity: 0.92;
          margin: 8px 0 28px;
          letter-spacing: -0.02em;
        }
      `}</style>
    </footer>
  );
}
