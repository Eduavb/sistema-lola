import type { BannerDados } from "@/lib/admin-banner";

export default function BannerPreview({ dados }: { dados: BannerDados }) {
  return (
    <div className="adm-prev" role="img" aria-label="Prévia do banner na vitrine">
      {dados.imagem && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={dados.imagem}
          alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
      )}
      <div
        style={{
          position: "absolute",
          left: "7cqw",
          right: "7cqw",
          bottom: "7cqw",
          display: "flex",
          flexDirection: "column",
          gap: "2.4cqw",
          maxWidth: "62cqw",
          color: "var(--ink)",
        }}
      >
        {dados.etiqueta && (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "max(8px, 1.9cqw)", letterSpacing: "0.08em" }}>
            {dados.etiqueta}
          </span>
        )}
        <span
          style={{
            fontSize: "max(20px, 7.6cqw)",
            lineHeight: 0.95,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            overflowWrap: "anywhere",
          }}
        >
          {dados.titulo || "Título do banner"}
        </span>
        {dados.subtitulo && (
          <span style={{ fontSize: "max(10px, 2.5cqw)", lineHeight: 1.5 }}>{dados.subtitulo}</span>
        )}
        <div style={{ display: "flex", gap: "1.6cqw", flexWrap: "wrap" }}>
          {dados.cta1_texto && (
            <span
              style={{
                background: "var(--peach)",
                fontSize: "max(9px, 2.3cqw)",
                fontWeight: 600,
                borderRadius: 10,
                padding: "1.9cqw 3cqw",
                whiteSpace: "nowrap",
              }}
            >
              {dados.cta1_texto}
            </span>
          )}
          {dados.cta2_mostrar && dados.cta2_texto && (
            <span
              style={{
                background: "#fff",
                border: "1px solid var(--line)",
                fontSize: "max(9px, 2.3cqw)",
                fontWeight: 600,
                borderRadius: 10,
                padding: "1.9cqw 3cqw",
                whiteSpace: "nowrap",
              }}
            >
              {dados.cta2_texto}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
