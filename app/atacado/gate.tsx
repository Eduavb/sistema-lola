import type { ReactElement } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { authedSupabase, exigirPapel, type Perfil } from "@/lib/auth";
import { decisaoGate } from "@/lib/atacado";
import { DEMO } from "@/lib/demo-catalogo";
import { supabase } from "@/lib/supabase";
import GateStatus from "@/components/atacado/GateStatus";
import { carregarCadastro } from "./dados";

export type ResultadoGate =
  | { ok: true; db: SupabaseClient; perfil: Perfil }
  | { ok: false; gate: ReactElement };

export async function exigirRevendedorAprovado(caminho: string): Promise<ResultadoGate> {
  if (DEMO) {
    const perfil: Perfil = { id: "demo", email: "demo@lola.local", nome: "Revendedora Demo", papel: "revendedor", ativo: true };
    return { ok: true, db: supabase(), perfil };
  }
  const perfil = await exigirPapel(["revendedor"], caminho);
  const db = await authedSupabase();
  const cadastro = await carregarCadastro(db);
  const decisao = decisaoGate({ papel: perfil.papel, ativo: perfil.ativo, status: cadastro?.status ?? null });

  if (decisao === "aprovado") return { ok: true, db, perfil };
  const estado = decisao === "pendente" || decisao === "recusado" ? decisao : "sem-cadastro";
  return { ok: false, gate: <GateStatus estado={estado} /> };
}
