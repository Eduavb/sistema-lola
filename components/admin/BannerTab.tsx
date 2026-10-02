"use client";

import { useEffect, useId, useState } from "react";
import {
  discardBanner,
  fetchBanner,
  publishBanner,
  saveBannerRascunho,
} from "@/app/admin/actions";
import {
  LARGURA_MAX_IMAGEM,
  LIMITE_ARQUIVO_ORIGEM,
  LIMITE_TEXTO_BANNER,
  QUALIDADE_JPEG,
  TIPOS_IMAGEM,
  dimensoesAlvo,
  temAlteracoes,
  validarBanner,
  validarDataUri,
  validarLinkBotao,
  validarTipoImagem,
  type BannerDados,
  type BannerServidor,
} from "@/lib/admin-banner";
import BannerPreview from "./BannerPreview";

type CampoTexto = "etiqueta" | "titulo" | "subtitulo" | "cta1_texto" | "cta1_link" | "cta2_texto";

const CAMPOS: { chave: CampoTexto; rotulo: string }[] = [
  { chave: "etiqueta", rotulo: "Etiqueta (acima do título)" },
  { chave: "titulo", rotulo: "Título" },
  { chave: "subtitulo", rotulo: "Subtítulo" },
  { chave: "cta1_texto", rotulo: "Texto do botão principal" },
  { chave: "cta1_link", rotulo: "Link do botão principal" },
  { chave: "cta2_texto", rotulo: "Texto do segundo botão" },
];

function lerArquivo(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result));
    leitor.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    leitor.readAsDataURL(arquivo);
  });
}

function carregarImagem(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não foi possível abrir essa imagem."));
    img.src = src;
  });
}

async function prepararFoto(arquivo: File): Promise<string> {
  const erroTipo = validarTipoImagem(arquivo.type);
  if (erroTipo) throw new Error(erroTipo);
  if (arquivo.size > LIMITE_ARQUIVO_ORIGEM) throw new Error("Esse arquivo é grande demais. Use uma foto de até 25 MB.");
  const img = await carregarImagem(await lerArquivo(arquivo));
  const { largura, altura } = dimensoesAlvo(img.naturalWidth, img.naturalHeight);
  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Seu navegador não conseguiu processar a imagem.");
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, largura, altura);
  ctx.drawImage(img, 0, 0, largura, altura);
  const uri = canvas.toDataURL("image/jpeg", QUALIDADE_JPEG);
  const erroTamanho = validarDataUri(uri);
  if (erroTamanho) throw new Error(erroTamanho);
  return uri;
}

function formatarData(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function BannerTab({ onToast }: { onToast: (mensagem: string) => void }) {
  const idBase = useId();
  const [servidor, setServidor] = useState<BannerServidor | null>(null);
  const [dados, setDados] = useState<BannerDados | null>(null);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [erroFoto, setErroFoto] = useState<string | null>(null);
  const [tentouPublicar, setTentouPublicar] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [lendoFoto, setLendoFoto] = useState(false);

  function aplicar(s: BannerServidor) {
    setServidor(s);
    setDados(s.rascunho ?? s.publicado);
  }

  useEffect(() => {
    let ativo = true;
    fetchBanner().then((r) => {
      if (!ativo) return;
      if (r.banner) {
        setServidor(r.banner);
        setDados(r.banner.rascunho ?? r.banner.publicado);
      } else {
        setErroCarga(r.error ?? "Não foi possível carregar o banner.");
      }
    });
    return () => {
      ativo = false;
    };
  }, []);

  if (erroCarga) {
    return (
      <p role="alert" className="adm-erro" style={{ fontSize: 13 }}>
        {erroCarga}
      </p>
    );
  }
  if (!servidor || !dados) {
    return (
      <p role="status" style={{ fontSize: 13, color: "var(--adm-text-secondary)" }}>
        Carregando banner...
      </p>
    );
  }

  const atual = dados;
  const naoPublicado = temAlteracoes(atual, servidor.publicado);
  const temRascunho = servidor.rascunho !== null;
  const erros = validarBanner(atual);
  const mostrarErroTitulo = tentouPublicar ? erros.titulo : undefined;
  const erroLink = validarLinkBotao(atual.cta1_link);
  const publicadoEm = formatarData(servidor.publicadoEm);

  function mudar<K extends keyof BannerDados>(chave: K, valor: BannerDados[K]) {
    setDados((d) => (d ? { ...d, [chave]: valor } : d));
    setErroAcao(null);
  }

  async function escolherFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;
    setErroFoto(null);
    setLendoFoto(true);
    try {
      mudar("imagem", await prepararFoto(arquivo));
    } catch (err) {
      setErroFoto(err instanceof Error ? err.message : "Não foi possível usar essa foto.");
    } finally {
      setLendoFoto(false);
    }
  }

  async function publicar() {
    setTentouPublicar(true);
    setErroAcao(null);
    if (Object.keys(validarBanner(atual)).length > 0) return;
    setOcupado(true);
    const salvo = await saveBannerRascunho(atual);
    if (salvo.error) {
      setOcupado(false);
      setErroAcao(salvo.error);
      return;
    }
    const publicado = await publishBanner();
    if (publicado.error) {
      setOcupado(false);
      setErroAcao(publicado.error);
      return;
    }
    const recarregado = await fetchBanner();
    setOcupado(false);
    if (recarregado.banner) aplicar(recarregado.banner);
    setTentouPublicar(false);
    onToast("Banner publicado na vitrine");
  }

  async function descartar() {
    setErroAcao(null);
    setOcupado(true);
    const { error } = await discardBanner();
    if (error) {
      setOcupado(false);
      setErroAcao(error);
      return;
    }
    const recarregado = await fetchBanner();
    setOcupado(false);
    if (recarregado.banner) aplicar(recarregado.banner);
    else setDados(servidor!.publicado);
    setErroFoto(null);
    setTentouPublicar(false);
    onToast("Alterações descartadas");
  }

  const idArquivo = `${idBase}-foto`;

  return (
    <div className="adm-banner-grade">
      <form
        className="adm-cartao"
        onSubmit={(e) => {
          e.preventDefault();
          if (naoPublicado && !ocupado) publicar();
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 600 }}>Conteúdo do banner</div>

        {CAMPOS.map(({ chave, rotulo }) => {
          const id = `${idBase}-${chave}`;
          const erro = chave === "cta1_link" ? erroLink : chave === "titulo" ? mostrarErroTitulo : undefined;
          return (
            <div key={chave} className="adm-campo">
              <label htmlFor={id} className="adm-rotulo">
                {rotulo}
              </label>
              <input
                id={id}
                type="text"
                className="adm-input"
                value={atual[chave]}
                maxLength={LIMITE_TEXTO_BANNER}
                onChange={(e) => mudar(chave, e.target.value)}
                aria-invalid={erro ? true : undefined}
                aria-describedby={erro ? `${id}-erro` : undefined}
              />
              {chave === "cta1_link" && (
                <span className="adm-dica">Deixe vazio para o botão não levar a lugar nenhum. Aceita /caminho, #âncora ou https://.</span>
              )}
              {erro && (
                <span id={`${id}-erro`} className="adm-erro">
                  {erro}
                </span>
              )}
            </div>
          );
        })}

        <label
          htmlFor={`${idBase}-cta2`}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            fontSize: 13,
            paddingTop: 4,
            cursor: "pointer",
          }}
        >
          Mostrar segundo botão
          <input
            id={`${idBase}-cta2`}
            type="checkbox"
            className="swtoggle"
            checked={atual.cta2_mostrar}
            onChange={(e) => mudar("cta2_mostrar", e.target.checked)}
          />
        </label>

        <div className="adm-campo">
          <label htmlFor={idArquivo} className="adm-rotulo">
            Foto do banner
          </label>
          <input
            id={idArquivo}
            type="file"
            accept={TIPOS_IMAGEM.join(",")}
            onChange={escolherFoto}
            disabled={lendoFoto}
            className="adm-arquivo"
            aria-describedby={`${idArquivo}-dica`}
            style={{ fontSize: 13 }}
          />
          <span id={`${idArquivo}-dica`} className="adm-dica">
            JPG, PNG ou WebP. A foto é reduzida para até {LARGURA_MAX_IMAGEM}px de largura.
            {lendoFoto && " Processando..."}
          </span>
          {atual.imagem && (
            <button
              type="button"
              className="adm-btn"
              style={{ alignSelf: "flex-start", padding: "6px 12px", fontSize: 12 }}
              onClick={() => {
                mudar("imagem", null);
                setErroFoto(null);
              }}
            >
              Remover foto
            </button>
          )}
          {erroFoto && (
            <span role="alert" className="adm-erro">
              {erroFoto}
            </span>
          )}
        </div>

        {erroAcao && (
          <p role="alert" className="adm-erro" style={{ margin: 0 }}>
            {erroAcao}
          </p>
        )}

        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            paddingTop: 10,
            borderTop: "1px solid var(--line)",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            className="adm-btn"
            onClick={descartar}
            disabled={ocupado || (!naoPublicado && !temRascunho)}
          >
            Descartar
          </button>
          <button
            type="submit"
            className="adm-btn adm-btn-primario"
            disabled={ocupado || !naoPublicado || Boolean(erroLink)}
          >
            {ocupado ? "Publicando..." : "Publicar na vitrine"}
          </button>
        </div>
      </form>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--adm-text-secondary)",
            letterSpacing: "0.04em",
          }}
        >
          PRÉ-VISUALIZAÇÃO
        </div>
        <BannerPreview dados={atual} />
        <div role="status" style={{ fontSize: 12, color: "var(--adm-text-secondary)" }}>
          {naoPublicado
            ? "Alterações não publicadas"
            : `Publicado na vitrine${publicadoEm ? ` em ${publicadoEm}` : ""}`}
        </div>
      </div>
    </div>
  );
}
