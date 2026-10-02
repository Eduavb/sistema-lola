"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const DURACAO_TOAST_MS = 3000;

export function useToast() {
  const [mensagem, setMensagem] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fechar = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setMensagem("");
  }, []);

  const mostrar = useCallback((texto: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMensagem(texto);
    timer.current = setTimeout(() => {
      timer.current = null;
      setMensagem("");
    }, DURACAO_TOAST_MS);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  return { mensagem, mostrar, fechar };
}

export default function Toast({ mensagem }: { mensagem: string }) {
  return (
    <div className="adm-toast" role="status" aria-live="polite">
      {mensagem && <div className="adm-toast-caixa">{mensagem}</div>}
    </div>
  );
}
