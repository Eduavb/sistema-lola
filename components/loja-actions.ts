"use server";

import {
  carregarDadosHeader,
  carregarDadosRodape,
  type DadosHeader,
  type DadosRodape,
} from "@/lib/header-dados";

export async function buscarDadosHeader(): Promise<DadosHeader> {
  return carregarDadosHeader();
}

export async function buscarDadosRodape(): Promise<DadosRodape> {
  return carregarDadosRodape();
}
