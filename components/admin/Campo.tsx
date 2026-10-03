"use client";

import { useId, type ReactNode } from "react";

export type PropsCampo = {
  id: string;
  "aria-invalid"?: true;
  "aria-describedby"?: string;
};

export default function Campo({
  rotulo,
  erro,
  dica,
  children,
}: {
  rotulo: string;
  erro?: string;
  dica?: string;
  children: (props: PropsCampo) => ReactNode;
}) {
  const id = useId();
  const dicaId = `${id}-dica`;
  const erroId = `${id}-erro`;
  const descritoPor = [dica ? dicaId : "", erro ? erroId : ""].filter(Boolean).join(" ") || undefined;
  return (
    <div className="adm-campo">
      <label htmlFor={id} className="adm-rotulo">
        {rotulo}
      </label>
      {children({ id, "aria-invalid": erro ? true : undefined, "aria-describedby": descritoPor })}
      {dica && (
        <span id={dicaId} className="adm-dica">
          {dica}
        </span>
      )}
      {erro && (
        <span id={erroId} className="adm-erro">
          {erro}
        </span>
      )}
    </div>
  );
}
