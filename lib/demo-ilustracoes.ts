// Ilustrações em SVG dos produtos fictícios da demonstração local (ver demo-catalogo.ts).
export type Tipo = "tenis" | "sandalia" | "sapatilha" | "bolsa" | "scrunchie";

function ajustar(hex: string, delta: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, v + delta));
  const r = c((n >> 16) & 255);
  const g = c((n >> 8) & 255);
  const b = c(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function gradiente(id: string, cor: string, claro = 38, escuro = -22): string {
  return (
    `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="${ajustar(cor, claro)}"/>` +
    `<stop offset="1" stop-color="${ajustar(cor, escuro)}"/></linearGradient>`
  );
}

const SOLA = `<linearGradient id="sola" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#E7DFD6"/></linearGradient>`;

const FORMAS: Record<Tipo, (c: string) => string> = {
  tenis: (c) => `
    <defs>${gradiente("g", c)}${SOLA}</defs>
    <path d="M95 396 Q95 372 122 370 L520 366 Q546 372 541 396 Q538 426 505 429 L128 431 Q95 429 95 396Z" fill="url(#sola)"/>
    <path d="M108 414 Q320 424 531 410" fill="none" stroke="${ajustar(c, -30)}" stroke-width="7" stroke-linecap="round" opacity=".55"/>
    <path d="M116 372 L128 300 Q133 268 166 260 L232 248 Q264 212 302 202 L352 230 Q398 286 452 300 Q532 316 539 372Z" fill="url(#g)"/>
    <path d="M440 298 Q532 316 539 372 L428 372 Q440 342 440 298Z" fill="${ajustar(c, -26)}"/>
    <path d="M166 260 Q202 244 232 248 L250 276 Q205 288 160 292Z" fill="${ajustar(c, -70)}"/>
    <path d="M232 248 Q264 212 302 202 L318 230 Q286 240 264 264Z" fill="${ajustar(c, 55)}"/>
    <path d="M116 372 L125 322 L160 318 L162 372Z" fill="${ajustar(c, -35)}"/>
    <path d="M172 346 Q252 308 342 330 Q402 344 430 372" fill="none" stroke="#fff" stroke-width="11" stroke-linecap="round" opacity=".9"/>
    <path d="M290 246 L326 276 M268 262 L304 294 M252 282 L286 310" stroke="#fff" stroke-width="8" stroke-linecap="round"/>
    <path d="M330 232 Q380 270 430 292" fill="none" stroke="#fff" stroke-width="3" opacity=".5"/>`,
  sandalia: (c) => `
    <defs>${gradiente("g", c, 45, -25)}<linearGradient id="cortica" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F1DCC2"/><stop offset="1" stop-color="#D9B58C"/></linearGradient></defs>
    <path d="M108 410 Q108 380 140 378 L502 358 Q542 358 542 386 Q542 412 506 416 L152 442 Q108 444 108 410Z" fill="url(#cortica)"/>
    <path d="M118 396 L520 374" fill="none" stroke="#fff" stroke-width="4" opacity=".55"/>
    <path d="M112 420 Q320 440 538 400" fill="none" stroke="#B88C5E" stroke-width="6" opacity=".6"/>
    <path d="M150 378 Q142 308 178 284" fill="none" stroke="url(#g)" stroke-width="26" stroke-linecap="round"/>
    <path d="M236 376 Q292 246 362 368" fill="none" stroke="url(#g)" stroke-width="34" stroke-linecap="round"/>
    <path d="M396 366 Q432 286 484 360" fill="none" stroke="url(#g)" stroke-width="30" stroke-linecap="round"/>
    <path d="M236 376 Q292 252 362 368" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="8 8" opacity=".7"/>
    <circle cx="178" cy="284" r="14" fill="#E8C26A"/><circle cx="178" cy="284" r="6" fill="#B58A2B"/>`,
  sapatilha: (c) => `
    <defs>${gradiente("g", c, 42, -20)}</defs>
    <path d="M104 396 Q104 346 170 336 Q242 330 300 352 Q382 322 452 334 Q538 348 540 396 Q540 426 492 430 L152 434 Q104 432 104 396Z" fill="url(#g)"/>
    <path d="M170 336 Q242 330 300 352 Q252 376 192 368Z" fill="${ajustar(c, -75)}"/>
    <path d="M300 352 Q382 322 452 334" fill="none" stroke="#fff" stroke-width="5" opacity=".5"/>
    <path d="M112 412 Q322 442 536 410 L536 424 Q322 458 112 428Z" fill="${ajustar(c, -45)}"/>
    <path d="M330 340 Q290 296 262 322 Q280 352 330 340Z M330 340 Q372 296 400 322 Q380 352 330 340Z" fill="${ajustar(c, 60)}"/>
    <circle cx="330" cy="340" r="14" fill="${ajustar(c, 20)}"/>`,
  bolsa: (c) => `
    <defs>${gradiente("g", c, 36, -24)}</defs>
    <path d="M214 262 Q206 138 300 138 Q394 138 386 262" fill="none" stroke="${ajustar(c, -30)}" stroke-width="20" stroke-linecap="round"/>
    <path d="M128 262 Q128 236 156 236 H444 Q472 236 472 262 L492 440 Q494 474 458 474 H142 Q106 474 108 440Z" fill="url(#g)"/>
    <path d="M128 262 Q128 236 156 236 H444 Q472 236 472 262 L478 330 Q300 392 122 330Z" fill="${ajustar(c, 22)}"/>
    <path d="M122 330 Q300 392 478 330" fill="none" stroke="${ajustar(c, -45)}" stroke-width="5" opacity=".6"/>
    <path d="M150 440 Q300 458 450 440" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="9 9" opacity=".6"/>
    <rect x="278" y="352" width="44" height="34" rx="9" fill="#E8C26A"/>
    <rect x="291" y="362" width="18" height="14" rx="4" fill="#B58A2B"/>`,
  scrunchie: (c) => {
    const pecas: string[] = [];
    const n = 16;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const x = 300 + Math.cos(a) * 112;
      const y = 300 + Math.sin(a) * 112;
      const deg = (a * 180) / Math.PI + 90;
      pecas.push(
        `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="64" ry="42" transform="rotate(${deg.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="${i % 2 ? ajustar(c, 18) : ajustar(c, -10)}" stroke="${ajustar(c, -40)}" stroke-opacity=".35" stroke-width="2"/>`
      );
    }
    return `${pecas.join("")}<circle cx="300" cy="300" r="62" fill="${ajustar(c, -60)}" opacity=".35"/>`;
  },
};

export function ilustracaoDemo(tipo: Tipo, cor: string, fundo: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">` +
    `<rect width="600" height="600" fill="${fundo}"/>` +
    `<circle cx="470" cy="150" r="90" fill="#fff" opacity=".35"/>` +
    `<ellipse cx="318" cy="452" rx="215" ry="20" fill="#2B2420" opacity=".1"/>` +
    FORMAS[tipo](cor) +
    `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
