"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import type { FotoGaleria } from "@/lib/galeria";
import { comprimirImagem, MENSAGEM_ARQUIVO_GRANDE } from "@/lib/comprimir-imagem";

type Mensagem = { tipo: "ok" | "erro"; texto: string };

const LIMITE = 20;
const CONFIRMA_MS = 4000;

export function GaleriaManager({ fotos: fotosIniciais }: { fotos: FotoGaleria[] }) {
  const [fotos, setFotos] = useState<FotoGaleria[]>(fotosIniciais);
  const [enviando, setEnviando] = useState<{ atual: number; total: number } | null>(null);
  const [mensagem, setMensagem] = useState<Mensagem | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function adicionar(arquivos: File[]) {
    setMensagem(null);
    let enviadas = 0;

    for (const [indice, arquivo] of arquivos.entries()) {
      setEnviando({ atual: indice + 1, total: arquivos.length });
      const dados = new FormData();
      dados.append("file", await comprimirImagem(arquivo));

      try {
        const resposta = await fetch("/api/galeria", { method: "POST", body: dados });
        const retorno = await resposta.json().catch(() => ({}));

        if (!resposta.ok) {
          const aviso = enviadas > 0 ? `${enviadas} de ${arquivos.length} enviadas. ` : "";
          const erro =
            retorno.error ?? (resposta.status === 413 ? MENSAGEM_ARQUIVO_GRANDE : "Não foi possível enviar a foto. Tente de novo.");
          setMensagem({ tipo: "erro", texto: `${aviso}${erro}` });
          break;
        }

        enviadas += 1;
        setFotos((atual) => [...atual, retorno.foto]);
      } catch {
        setMensagem({ tipo: "erro", texto: "Sem conexão. Verifique a internet e tente de novo." });
        break;
      }
    }

    setEnviando(null);
    if (inputRef.current) inputRef.current.value = "";
    if (enviadas > 0 && enviadas === arquivos.length) {
      setMensagem({ tipo: "ok", texto: enviadas === 1 ? "Foto adicionada à galeria." : `${enviadas} fotos adicionadas à galeria.` });
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
      setMensagem({ tipo: "erro", texto: "Sem conexão. Verifique a internet e tente de novo." });
    }
  }

  async function remover(id: string) {
    const anterior = fotos;
    setFotos((atual) => atual.filter((f) => f.id !== id));
    setMensagem(null);

    try {
      const resposta = await fetch(`/api/galeria/${id}`, { method: "DELETE" });
      if (!resposta.ok) {
        const retorno = await resposta.json().catch(() => ({}));
        setFotos(anterior);
        setMensagem({ tipo: "erro", texto: retorno.error ?? "Não foi possível remover a foto. Tente de novo." });
      } else {
        setMensagem({ tipo: "ok", texto: "Foto removida da galeria." });
      }
    } catch {
      setFotos(anterior);
      setMensagem({ tipo: "erro", texto: "Sem conexão. Verifique a internet e tente de novo." });
    }
  }

  async function salvarDescricao(id: string, alt: string) {
    const anterior = fotos;
    setFotos((atual) => atual.map((f) => (f.id === id ? { ...f, alt } : f)));
    setMensagem(null);

    try {
      const resposta = await fetch(`/api/galeria/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alt }),
      });
      if (!resposta.ok) {
        const retorno = await resposta.json().catch(() => ({}));
        setFotos(anterior);
        setMensagem({ tipo: "erro", texto: retorno.error ?? "Não foi possível salvar a descrição. Tente de novo." });
      }
    } catch {
      setFotos(anterior);
      setMensagem({ tipo: "erro", texto: "Sem conexão. Verifique a internet e tente de novo." });
    }
  }

  const cheia = fotos.length >= LIMITE;

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold text-gray-900">Fotos da galeria</h3>
          <p className="text-sm text-gray-500">
            Aparecem em carrossel na vitrine, nesta ordem. Sem fotos aqui, a vitrine mostra a foto da galeria do formulário abaixo.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
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
            {enviando ? `Enviando ${enviando.atual} de ${enviando.total}...` : "Adicionar fotos"}
          </Button>
          <p className="text-xs text-gray-400">
            {fotos.length} de {LIMITE} fotos. JPG, PNG ou WebP. Fotos grandes são reduzidas antes do envio.
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
        <Image
          src={foto.url}
          alt={foto.alt || `Foto ${numero} da galeria`}
          fill
          sizes="(min-width: 768px) 25vw, 50vw"
          className="object-cover"
          unoptimized
        />
      </div>

      <Input
        aria-label={`Descrição da foto ${numero}`}
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
