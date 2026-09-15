"use client";

import { useState, useRef } from "react";

export default function ProductGallery({
  images,
  alt,
}: {
  images: string[];
  alt: string;
}) {
  const [active, setActive] = useState(0);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [zooming, setZooming] = useState(false);
  const frameRef = useRef<HTMLDivElement | null>(null);

  const src = images[active] ?? null;

  function onMove(e: React.MouseEvent) {
    const el = frameRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x, y });
  }

  return (
    <div>
      <div
        ref={frameRef}
        onMouseMove={onMove}
        onMouseEnter={() => setZooming(true)}
        onMouseLeave={() => setZooming(false)}
        style={{
          aspectRatio: "4/5",
          overflow: "hidden",
          background: "var(--surface-muted)",
          border: "1px solid var(--line)",
          cursor: src ? "zoom-in" : "default",
        }}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
              transform: zooming ? "scale(1.9)" : "scale(1)",
              transition: zooming ? "none" : "transform .25s ease",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--muted)",
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Foto em breve
          </div>
        )}
      </div>
      {images.length > 1 && (
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              style={{
                width: 64,
                height: 64,
                border:
                  i === active ? "2px solid var(--ink-soft)" : "1px solid var(--line)",
                padding: 0,
                cursor: "pointer",
                overflow: "hidden",
                background: "var(--surface-muted)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </button>
          ))}
        </div>
      )}
      {/* Só faz sentido em telas com mouse — some no celular via CSS (.zoom-hint) */}
      <p className="zoom-hint" style={{ fontSize: 11, color: "var(--muted)", marginTop: 10, textAlign: "center" }}>
        Passe o mouse na foto pra dar zoom
      </p>
    </div>
  );
}
