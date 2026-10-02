import { traduzirPorLista } from "@/lib/admin-erros";

export type Promocao = {
  id: string;
  nome: string;
  desconto_percentual: number;
  aplica_a_categoria_id: string | null;
  categoria_nome: string | null;
  inicio: string | null;
  fim: string | null;
  cupom: string | null;
  ativa: boolean;
  created_at: string;
};

export type PromocaoForm = {
  nome: string;
  desconto: string;
  aplicaA: "loja" | "categoria";
  categoriaId: string;
  inicio: string;
  fim: string;
  cupom: string;
  ativa: boolean;
};

export type PromocaoPayload = {
  nome: string;
  desconto: number;
  categoria_id: string | null;
  inicio: string | null;
  fim: string | null;
  cupom: string | null;
  ativa: boolean;
};

export type ErrosPromocao = Partial<
  Record<"nome" | "desconto" | "categoriaId" | "inicio" | "fim" | "cupom", string>
>;

export const PROMOCAO_VAZIA: PromocaoForm = {
  nome: "",
  desconto: "",
  aplicaA: "loja",
  categoriaId: "",
  inicio: "",
  fim: "",
  cupom: "",
  ativa: true,
};

export const NOTA_CUPOM = "Cupom ainda não é aplicado no checkout.";

const DATA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

function dataValida(v: string): boolean {
  const m = DATA_ISO.exec(v);
  if (!m) return false;
  const [ano, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  return d.getUTCFullYear() === ano && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia;
}

export function validarPromocao(form: PromocaoForm): {
  erros: ErrosPromocao;
  payload: PromocaoPayload | null;
} {
  const erros: ErrosPromocao = {};
  const nome = form.nome.trim();
  if (!nome) erros.nome = "Informe o nome da promoção.";
  else if (nome.length > 120) erros.nome = "O nome pode ter no máximo 120 caracteres.";

  const descontoTxt = form.desconto.trim();
  const desconto = /^\d+$/.test(descontoTxt) ? Number(descontoTxt) : NaN;
  if (!Number.isInteger(desconto) || desconto < 1 || desconto > 90) {
    erros.desconto = "O desconto deve ser um número inteiro entre 1 e 90.";
  }

  if (form.aplicaA === "categoria" && !form.categoriaId) {
    erros.categoriaId = "Escolha a categoria.";
  }

  const inicio = form.inicio.trim();
  const fim = form.fim.trim();
  if (inicio && !dataValida(inicio)) erros.inicio = "Data de início inválida.";
  if (fim && !dataValida(fim)) erros.fim = "Data de fim inválida.";
  if (!erros.inicio && !erros.fim && inicio && fim && fim < inicio) {
    erros.fim = "O fim não pode ser antes do início.";
  }

  const cupom = form.cupom.trim().toUpperCase();
  if (cupom && !/^[A-Z0-9_-]{1,40}$/.test(cupom)) {
    erros.cupom = "Use até 40 letras, números, hífen ou sublinhado, sem espaços.";
  }

  if (Object.keys(erros).length > 0) return { erros, payload: null };
  return {
    erros,
    payload: {
      nome,
      desconto,
      categoria_id: form.aplicaA === "categoria" ? form.categoriaId : null,
      inicio: inicio || null,
      fim: fim || null,
      cupom: cupom || null,
      ativa: form.ativa,
    },
  };
}

function ddmm(iso: string): string {
  const m = DATA_ISO.exec(iso);
  return m ? `${m[3]}/${m[2]}` : "";
}

export function formatarPeriodo(inicio: string | null, fim: string | null): string {
  const i = inicio ? ddmm(inicio) : "";
  const f = fim ? ddmm(fim) : "";
  if (i && f) return `${i} → ${f}`;
  if (i) return `a partir de ${i}`;
  if (f) return `até ${f}`;
  return "Sem prazo";
}

export function rotuloAplicaA(p: Pick<Promocao, "aplica_a_categoria_id" | "categoria_nome">): string {
  if (!p.aplica_a_categoria_id) return "Toda a loja";
  return p.categoria_nome || "Categoria removida";
}

export function promocaoParaForm(p: Promocao): PromocaoForm {
  return {
    nome: p.nome,
    desconto: String(p.desconto_percentual),
    aplicaA: p.aplica_a_categoria_id ? "categoria" : "loja",
    categoriaId: p.aplica_a_categoria_id ?? "",
    inicio: p.inicio ?? "",
    fim: p.fim ?? "",
    cupom: p.cupom ?? "",
    ativa: p.ativa,
  };
}

export function payloadParaForm(p: PromocaoPayload): PromocaoForm {
  return {
    nome: p.nome,
    desconto: String(p.desconto),
    aplicaA: p.categoria_id ? "categoria" : "loja",
    categoriaId: p.categoria_id ?? "",
    inicio: p.inicio ?? "",
    fim: p.fim ?? "",
    cupom: p.cupom ?? "",
    ativa: p.ativa,
  };
}

export function traduzirErroPromocao(mensagem: string): string {
  return traduzirPorLista(mensagem, [
    [/cupom já usado/, "Esse cupom já está em uso em outra promoção ativa."],
    [/cupom inválido/, "Cupom inválido. Use até 40 letras, números, hífen ou sublinhado."],
    [/nome da promoção é obrigatório/, "Informe o nome da promoção."],
    [/nome da promoção muito longo/, "O nome pode ter no máximo 120 caracteres."],
    [/desconto deve estar/, "O desconto deve estar entre 1% e 90%."],
    [/data final anterior/, "O fim não pode ser antes do início."],
    [/categoria não encontrada/, "Categoria não encontrada. Atualize a página."],
    [/registro não encontrado/, "Promoção não encontrada. Atualize a página."],
  ], "Não foi possível salvar a promoção agora. Tente de novo.");
}
