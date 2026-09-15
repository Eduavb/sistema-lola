export default function BrandStory() {
  return (
    <section className="section">
      <div className="wrap brand-story-grid fade-up">
        <div className="brand-story-copy">
          <span className="eyebrow-mono">Sobre a LOLA</span>
          <h2 className="brand-story-title">Feito pra combinar com você</h2>
          <p>
            Cada par nasce pra acompanhar seus dias — do compromisso sério
            ao role sem hora pra acabar. Cores que conversam entre si,
            conforto que não pede desculpas.
          </p>
        </div>
        <div className="brand-story-collage">
          <div className="collage-ph collage-ph--a">
            <span>Espaço reservado</span>
          </div>
          <div className="collage-ph collage-ph--b">
            <span>Espaço reservado</span>
          </div>
          <div className="collage-ph collage-ph--c">
            <span>Espaço reservado</span>
          </div>
        </div>
      </div>
      <style>{`
        .eyebrow-mono {
          display: inline-block;
          font-family: var(--font-mono), monospace;
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--peach-deep);
        }
        .section-head {
          text-align: center;
          margin-bottom: 36px;
        }
        .section-head .section-title-new {
          font-family: var(--font-display), sans-serif;
          font-weight: 800;
          font-size: var(--fs-h2);
          line-height: 1;
          margin: 10px 0 0;
        }

        .brand-story-grid {
          display: grid;
          grid-template-columns: 1fr 1.3fr;
          gap: 48px;
          align-items: center;
        }
        @media (max-width: 860px) {
          .brand-story-grid { grid-template-columns: 1fr; }
        }
        .brand-story-title {
          font-family: var(--font-display), sans-serif;
          font-size: var(--fs-h2);
          font-weight: 800;
          line-height: 1;
          margin: 12px 0 16px;
        }
        .brand-story-copy p {
          color: var(--ink-soft);
          font-size: 15px;
          line-height: 1.6;
          max-width: 42ch;
          margin: 0;
        }
        .brand-story-collage {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        @media (max-width: 640px) {
          .brand-story-collage { grid-template-columns: repeat(3, 1fr); gap: 10px; }
        }
        .collage-ph {
          aspect-ratio: 3 / 4;
          border-radius: 14px;
          background: var(--surface-muted);
          border: 1px dashed var(--line);
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 10px;
        }
        .collage-ph span {
          font-size: 10.5px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--ink);
        }
        .collage-ph--a { transform: translateY(-18px); background: var(--pink); border: none; }
        .collage-ph--b { transform: translateY(14px); }
        .collage-ph--c { transform: translateY(-6px); background: var(--mint); border: none; }
        @media (max-width: 640px) {
          .collage-ph { transform: none !important; }
        }
      `}</style>
    </section>
  );
}
