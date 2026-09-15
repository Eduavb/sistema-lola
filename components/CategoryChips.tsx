import type { Categoria } from "@/lib/types";
import { corDaCategoria } from "@/lib/brand.config";
import SwingTag from "@/components/SwingTag";

export default function CategoryChips({ categorias }: { categorias: Categoria[] }) {
  if (categorias.length === 0) return null;

  return (
    <section style={{ padding: "8px 0 40px" }}>
      <div className="wrap chip-row">
        {categorias.map((c, i) => {
          const cor = corDaCategoria(c);
          return (
            <SwingTag
              key={c.id}
              href={`/#${c.grupo}`}
              color={cor.base}
              size="md"
              rotate={i % 2 === 0 ? -4 : 4}
            >
              {c.nome}
            </SwingTag>
          );
        })}
      </div>
      <style>{`
        .chip-row {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 18px 14px;
        }
      `}</style>
    </section>
  );
}
