"use client";

import { useEffect, useState } from "react";
import RodapeView from "@/components/RodapeView";
import { buscarDadosRodape } from "@/components/loja-actions";
import { TEXTOS_PADRAO } from "@/lib/textos";
import type { DadosRodape } from "@/lib/header-dados";

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

const INICIAL: DadosRodape = { categorias: [], textos: TEXTOS_PADRAO };

export function SiteFooter() {
  const [dados, setDados] = useState<DadosRodape>(INICIAL);

  useEffect(() => {
    let ativo = true;
    buscarDadosRodape()
      .then((d) => {
        if (ativo) setDados(d);
      })
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, []);

  return <RodapeView textos={dados.textos} categorias={dados.categorias} />;
}
