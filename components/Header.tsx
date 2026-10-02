"use client";

import AvisoBar from "@/components/home/AvisoBar";
import HeaderClient from "@/components/HeaderClient";
import { buscarDadosHeader } from "@/components/loja-actions";
import { criarCache, useDadosCacheados } from "@/components/loja-cache";
import type { DadosHeader } from "@/lib/header-dados";

const cacheHeader = criarCache<DadosHeader>();

export default function Header() {
  const dados = useDadosCacheados(cacheHeader, buscarDadosHeader);

  return (
    <>
      {dados ? (
        <AvisoBar texto={dados.avisoTexto} ativo={dados.avisoAtivo} />
      ) : (
        <div className="aviso-bar aviso-bar-reserva" aria-hidden="true" />
      )}
      <HeaderClient categorias={dados?.categorias ?? []} perfil={dados?.perfil ?? null} />
    </>
  );
}
