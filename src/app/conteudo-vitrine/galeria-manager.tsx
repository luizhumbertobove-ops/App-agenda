"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { apiRequest } from "@/lib/api-client";
import type { FotoGaleria } from "@/lib/galeria";
import { comprimirImagem, MENSAGEM_ARQUIVO_GRANDE } from "@/lib/comprimir-imagem";

type Mensagem = { tipo: "ok" | "erro"; texto: string };
type Resultado = { ok: true; foto: FotoGaleria } | { ok: false; erro: string };
type Envio = { atual: number; total: number; video: boolean; percentual: number };

// Mesmo valor de LIMITE_ITENS_GALERIA (src/lib/galeria.ts). Não importamos de lá: esse módulo puxa o Prisma e não pode ir ao navegador.
const LIMITE = 20;
const LIMITE_VIDEO_BYTES = 50 * 1024 * 1024;
const CONFIRMA_MS = 4000;
const MENSAGEM_VIDEO_GRANDE = "O vídeo passa de 50 MB. Escolha um vídeo mais curto.";
const MENSAGEM_SEM_CONEXAO = "Sem conexão. Verifique a internet e tente de novo.";

/** Envia o arquivo direto ao armazenamento, informando o progresso (XMLHttpRequest permite medir o upload). */
function enviarArquivo(url: string, arquivo: File, aoProgredir: (percentual: number) => void): Promise<boolean> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", arquivo.type);
    xhr.upload.onprogress = (evento) => {
      if (evento.lengthComputable) aoProgredir(Math.round((evento.loaded / evento.total) * 100));
    };
    xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300);
    xhr.onerror = () => resolve(false);
    xhr.onabort = () => resolve(false);
    xhr.send(arquivo);
  });
}

async function enviarFoto(arquivo: File): Promise<Resultado> {
  const dados = new FormData();
  dados.append("file", await comprimirImagem(arquivo));

  try {
    const resposta = await fetch("/api/galeria", { method: "POST", body: dados });
    const retorno = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
      const erro =
        retorno.error ?? (resposta.status === 413 ? MENSAGEM_ARQUIVO_GRANDE : "Não foi possível enviar a foto. Tente de novo.");
      return { ok: false, erro };
    }
    return { ok: true, foto: retorno.foto };
  } catch {
    return { ok: false, erro: MENSAGEM_SEM_CONEXAO };
  }
}

/** Vídeo em 3 passos: pedir o endereço de envio, subir direto ao armazenamento, confirmar na galeria. */
async function enviarVideo(arquivo: File, aoProgredir: (percentual: number) => void): Promise<Resultado> {
  if (arquivo.size > LIMITE_VIDEO_BYTES) return { ok: false, erro: MENSAGEM_VIDEO_GRANDE };

  const envio = await apiRequest<{ uploadUrl: string; path: string }>(
    "/api/galeria/video/envio",
    { method: "POST", body: { tipo: arquivo.type, tamanho: arquivo.size } },
    "Não foi possível enviar o vídeo. Tente de novo.",
  );
  if (!envio.ok) return { ok: false, erro: envio.error };
  if (!envio.data?.uploadUrl || !envio.data.path) {
    return { ok: false, erro: "Não foi possível enviar o vídeo. Tente de novo." };
  }

  const subiu = await enviarArquivo(envio.data.uploadUrl, arquivo, aoProgredir);
  if (!subiu) return { ok: false, erro: "Não foi possível enviar o vídeo. Tente de novo." };

  const confirmacao = await apiRequest<{ foto: FotoGaleria }>(
    "/api/galeria/video",
    { method: "POST", body: { path: envio.data.path } },
    "Não foi possível adicionar o vídeo. Tente de novo.",
  );
  if (!confirmacao.ok) return { ok: false, erro: confirmacao.error };
  return { ok: true, foto: confirmacao.data.foto };
}

export function GaleriaManager({ fotos: fotosIniciais }: { fotos: FotoGaleria[] }) {
  const [fotos, setFotos] = useState<FotoGaleria[]>(fotosIniciais);
  const [enviando, setEnviando] = useState<Envio | null>(null);
  const [mensagem, setMensagem] = useState<Mensagem | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function adicionar(arquivos: File[]) {
    setMensagem(null);
    let enviadas = 0;

    for (const [indice, arquivo] of arquivos.entries()) {
      const ehVideo = arquivo.type.startsWith("video/");
      setEnviando({ atual: indice + 1, total: arquivos.length, video: ehVideo, percentual: 0 });

      const resultado = ehVideo
        ? await enviarVideo(arquivo, (percentual) =>
            setEnviando((atual) => (atual ? { ...atual, percentual } : atual)),
          )
        : await enviarFoto(arquivo);

      if (!resultado.ok) {
        const aviso = enviadas > 0 ? `${enviadas} de ${arquivos.length} enviadas. ` : "";
        setMensagem({ tipo: "erro", texto: `${aviso}${resultado.erro}` });
        break;
      }

      enviadas += 1;
      const foto = resultado.foto;
      setFotos((atual) => [...atual, foto]);
    }

    setEnviando(null);
    if (inputRef.current) inputRef.current.value = "";
    if (enviadas > 0 && enviadas === arquivos.length) {
      setMensagem({ tipo: "ok", texto: enviadas === 1 ? "Item adicionado à galeria." : `${enviadas} itens adicionados à galeria.` });
    }
  }

  async function mover(indice: number, direcao: -1 | 1) {
    const destino = indice + direcao;
    if (destino < 0 || destino >= fotos.length) return;

    const anterior = fotos;
    const nova = [...fotos];
    [nova[indice], nova[destino]] = [nova[destino], nova[indice]];
    setFotos(nova);
    setMensagem(null);

    try {
      const resposta = await fetch("/api/galeria/ordem", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: nova.map((f) => f.id) }),
      });
      if (!resposta.ok) {
        const retorno = await resposta.json().catch(() => ({}));
        setFotos(anterior);
        setMensagem({ tipo: "erro", texto: retorno.error ?? "Não foi possível mudar a ordem. Tente de novo." });
      }
    } catch {
      setFotos(anterior);
      setMensagem({ tipo: "erro", texto: MENSAGEM_SEM_CONEXAO });
    }
  }

  async function remover(id: string) {
    const anterior = fotos;
    setFotos((atual) => atual.filter((f) => f.id !== id));
    setMensagem(null);

    const r = await apiRequest(
      `/api/galeria/${id}`,
      { method: "DELETE" },
      "Não foi possível remover a foto. Tente de novo.",
    );
    if (!r.ok) {
      setFotos(anterior);
      setMensagem({ tipo: "erro", texto: r.error });
    } else {
      setMensagem({ tipo: "ok", texto: "Foto removida da galeria." });
    }
  }

  async function salvarDescricao(id: string, alt: string) {
    const anterior = fotos;
    setFotos((atual) => atual.map((f) => (f.id === id ? { ...f, alt } : f)));
    setMensagem(null);

    const r = await apiRequest(
      `/api/galeria/${id}`,
      { method: "PATCH", body: { alt } },
      "Não foi possível salvar a descrição. Tente de novo.",
    );
    if (!r.ok) {
      setFotos(anterior);
      setMensagem({ tipo: "erro", texto: r.error });
    }
  }

  const cheia = fotos.length >= LIMITE;

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold text-gray-900">Fotos e vídeos da galeria</h3>
          <p className="text-sm text-gray-500">
            Aparecem em carrossel na vitrine, nesta ordem. Sem itens aqui, a vitrine mostra a foto da galeria do formulário abaixo.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
            className="hidden"
            onChange={(e) => {
              const arquivos = Array.from(e.target.files ?? []);
              if (arquivos.length > 0) void adicionar(arquivos);
            }}
          />
          <Button
            variant="secondary"
            disabled={!!enviando || cheia}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5"
          >
            <Plus size={16} aria-hidden="true" />
            {enviando
              ? enviando.video
                ? `Enviando vídeo... ${enviando.percentual}%`
                : `Enviando ${enviando.atual} de ${enviando.total}...`
              : "Adicionar fotos ou vídeos"}
          </Button>
          <p className="text-xs text-gray-400">
            {fotos.length} de {LIMITE} itens. Fotos JPG, PNG ou WebP; vídeos MP4, WebM ou MOV até 50 MB. Vídeos tocam em loop, sem som.
          </p>
        </div>
      </div>

      {mensagem && (
        <p
          role={mensagem.tipo === "erro" ? "alert" : "status"}
          className={`text-sm ${mensagem.tipo === "erro" ? "text-red-600" : "text-green-700"}`}
        >
          {mensagem.texto}
        </p>
      )}

      {fotos.length === 0 ? (
        <p className="rounded-lg bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
          Nenhuma foto ainda. Adicione a primeira.
        </p>
      ) : (
        <ul className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {fotos.map((foto, indice) => (
            <FotoCard
              // A chave inclui a descrição salva: se ela voltar atrás (falha ao salvar), o campo acompanha.
              key={`${foto.id}:${foto.alt}`}
              foto={foto}
              numero={indice + 1}
              primeira={indice === 0}
              ultima={indice === fotos.length - 1}
              onMover={(direcao) => void mover(indice, direcao)}
              onRemover={() => void remover(foto.id)}
              onSalvarDescricao={(alt) => void salvarDescricao(foto.id, alt)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function FotoCard({
  foto,
  numero,
  primeira,
  ultima,
  onMover,
  onRemover,
  onSalvarDescricao,
}: {
  foto: FotoGaleria;
  numero: number;
  primeira: boolean;
  ultima: boolean;
  onMover: (direcao: -1 | 1) => void;
  onRemover: () => void;
  onSalvarDescricao: (alt: string) => void;
}) {
  const [descricao, setDescricao] = useState(foto.alt);
  const [confirmando, setConfirmando] = useState(false);

  // Confirmação da remoção some sozinha depois de alguns segundos.
  useEffect(() => {
    if (!confirmando) return;
    const timer = setTimeout(() => setConfirmando(false), CONFIRMA_MS);
    return () => clearTimeout(timer);
  }, [confirmando]);

  function salvarSeMudou() {
    const limpa = descricao.trim();
    if (limpa !== foto.alt) onSalvarDescricao(limpa);
    setDescricao(limpa);
  }

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-gray-200 p-2">
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-lg bg-gray-100">
        {foto.type === "VIDEO" ? (
          <>
            <video
              src={`${foto.url}#t=0.1`}
              muted
              playsInline
              preload="metadata"
              aria-label={foto.alt || `Vídeo ${numero} da galeria`}
              className="absolute inset-0 size-full object-cover"
            />
            <span className="absolute left-2 top-2 rounded-full bg-gray-900/70 px-2 py-0.5 text-xs text-white">Vídeo</span>
          </>
        ) : (
          <Image
            src={foto.url}
            alt={foto.alt || `Foto ${numero} da galeria`}
            fill
            sizes="(min-width: 768px) 25vw, 50vw"
            className="object-cover"
            unoptimized
          />
        )}
      </div>

      <Input
        aria-label={`Descrição do item ${numero}`}
        placeholder="Descrição (opcional)"
        value={descricao}
        maxLength={200}
        onChange={(e) => setDescricao(e.target.value)}
        onBlur={salvarSeMudou}
        className="px-2.5 py-2"
      />

      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Mover para antes"
            disabled={primeira}
            onClick={() => onMover(-1)}
            className="flex size-11 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Mover para depois"
            disabled={ultima}
            onClick={() => onMover(1)}
            className="flex size-11 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>

        {confirmando ? (
          <button
            type="button"
            onClick={onRemover}
            className="flex min-h-11 flex-1 items-center justify-center rounded-full bg-red-600 px-3 text-sm font-medium text-white hover:bg-red-700 transition-colors"
          >
            Confirmar remoção
          </button>
        ) : (
          <button
            type="button"
            aria-label="Remover foto"
            onClick={() => setConfirmando(true)}
            className="flex size-11 items-center justify-center rounded-full text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <Trash2 size={18} aria-hidden="true" />
          </button>
        )}
      </div>
    </li>
  );
}
