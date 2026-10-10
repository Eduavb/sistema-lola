import type { ReactNode } from "react";

type Passo = {
  estado: "feito" | "atual" | "espera";
  titulo: string;
  texto: string;
  icone: ReactNode;
};

const TRACO = { fill: "none", stroke: "currentColor", strokeWidth: 2.4, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const ICONES = {
  check: (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" {...TRACO}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  ),
  email: (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" {...TRACO}>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="M4 7.5l8 6 8-6" />
    </svg>
  ),
  enviado: (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" {...TRACO}>
      <path d="M21 4L10 14M21 4l-6.5 16-3.5-6.5L4.5 10 21 4z" />
    </svg>
  ),
};

export default function ChecklistRevendedor({ email }: { email: string }) {
  const passos: Passo[] = [
    {
      estado: "feito",
      titulo: "Cadastro",
      texto: "Recebemos os dados da sua loja.",
      icone: ICONES.check,
    },
    {
      estado: "atual",
      titulo: "Confirmação por e-mail",
      texto: email
        ? `Acesse o e-mail ${email} e clique no link de confirmação. Veja também a caixa de spam.`
        : "Acesse seu e-mail e clique no link de confirmação. Veja também a caixa de spam.",
      icone: ICONES.email,
    },
    {
      estado: "espera",
      titulo: "Solicitação enviada",
      texto: "Aprovação pendente. Primeiro confirme seu e-mail; depois a equipe LOLA avalia seu cadastro.",
      icone: ICONES.enviado,
    },
  ];

  return (
    <section className="auth-check" aria-labelledby="auth-check-titulo">
      <h2 id="auth-check-titulo" className="auth-check-titulo">
        Quase lá!
      </h2>
      <p className="auth-check-sub">Falta confirmar seu e-mail para a equipe analisar seu cadastro.</p>
      <ol className="auth-check-lista">
        {passos.map((p) => (
          <li key={p.titulo} className={`auth-check-passo auth-check-passo--${p.estado}`}>
            <span className="auth-check-marca">{p.icone}</span>
            <span className="auth-check-corpo">
              <span className="auth-check-nome">{p.titulo}</span>
              <span className="auth-check-texto">{p.texto}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
