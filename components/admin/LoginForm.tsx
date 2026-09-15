"use client";

import { useActionState } from "react";
import { loginAdmin } from "@/app/admin/actions";
import { BRAND } from "@/lib/brand.config";

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAdmin, undefined);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
      }}
    >
      <form
        action={formAction}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          padding: "44px 40px",
          width: 340,
          maxWidth: "90vw",
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontWeight: 500,
            fontSize: 26,
            color: "var(--ink-soft)",
            marginBottom: 6,
            textAlign: "center",
          }}
        >
          {`Painel ${BRAND.nome}`}
        </h1>
        <p style={{ textAlign: "center", fontSize: 12.5, color: "var(--muted)", marginBottom: 26 }}>
          Acesso administrativo
        </p>
        <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 8 }}>
          Senha de acesso
        </label>
        <input
          name="senha"
          type="password"
          required
          autoFocus
          style={{
            width: "100%",
            padding: "12px 14px",
            border: "1px solid var(--line)",
            marginBottom: 18,
            fontSize: 14,
          }}
        />
        {state?.error && (
          <p style={{ color: "#b23b3b", fontSize: 12.5, marginBottom: 14 }}>{state.error}</p>
        )}
        <button className="btn" type="submit" disabled={pending} style={{ width: "100%", justifyContent: "center" }}>
          {pending ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
