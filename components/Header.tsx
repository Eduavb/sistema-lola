"use client";

import { useEffect, useState } from "react";
import AvisoBar from "@/components/home/AvisoBar";
import HeaderClient from "@/components/HeaderClient";
import { buscarDadosHeader } from "@/components/loja-actions";
import type { DadosHeader } from "@/lib/header-dados";

const VAZIO: DadosHeader = { categorias: [], perfil: null, avisoTexto: "", avisoAtivo: "false" };

export default function Header() {
  const [dados, setDados] = useState<DadosHeader>(VAZIO);

  useEffect(() => {
    let ativo = true;
    buscarDadosHeader()
      .then((d) => {
        if (ativo) setDados(d);
      })
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, []);

  return (
    <>
      <AvisoBar texto={dados.avisoTexto} ativo={dados.avisoAtivo} />
      <HeaderClient categorias={dados.categorias} perfil={dados.perfil} />
    </>
  );
}
