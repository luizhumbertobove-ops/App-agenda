"use client";

import { useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { Button } from "@/components/button";
import { Input, Textarea } from "@/components/input";
import type { CampoVitrine } from "@/lib/vitrine-content";

type Mensagem = { tipo: "ok" | "erro"; texto: string };

type Props = {
  campos: readonly CampoVitrine[];
  valores: Record<string, string>;
};

export function VitrineForm({ campos, valores: valoresIniciais }: Props) {
  const [valores, setValores] = useState<Record<string, string>>(valoresIniciais);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<Mensagem | null>(null);

  const secoes = new Map<string, CampoVitrine[]>();
  for (const campo of campos) {
    secoes.set(campo.section, [...(secoes.get(campo.section) ?? []), campo]);
  }

  function atualizar(key: string, value: string) {
    setValores((atual) => ({ ...atual, [key]: value }));
  }

  async function salvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSalvando(true);
    setMensagem(null);

    const textos = Object.fromEntries(
      campos.filter((c) => c.type !== "image").map((c) => [c.key, valores[c.key] ?? ""])
    );

    try {
      const resposta = await fetch("/api/conteudo-vitrine", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valores: textos }),
      });
      const dados = await resposta.json().catch(() => ({}));

      if (!resposta.ok) {
        setMensagem({ tipo: "erro", texto: dados.error ?? "Não foi possível salvar. Tente de novo." });
      } else {
        setMensagem({ tipo: "ok", texto: "Alterações salvas. A vitrine já mostra o novo conteúdo." });
      }
    } catch {
      setMensagem({ tipo: "erro", texto: "Sem conexão. Verifique a internet e tente de novo." });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={salvar} className="flex flex-col gap-6">
      {[...secoes.entries()].map(([secao, camposDaSecao]) => (
        <section key={secao} className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-4">
          <h3 className="font-semibold text-gray-900">{secao}</h3>

          {camposDaSecao.map((campo) => {
            const id = `campo-${campo.key}`;

            if (campo.type === "image") {
              return (
                <ImagemCampo
                  key={campo.key}
                  campo={campo}
                  url={valores[campo.key] ?? campo.default}
                  onEnviada={(url) => atualizar(campo.key, url)}
                  onErro={(texto) => setMensagem({ tipo: "erro", texto })}
                  onSucesso={(texto) => setMensagem({ tipo: "ok", texto })}
                />
              );
            }

            return (
              <div key={campo.key} className="flex flex-col gap-1">
                <label htmlFor={id} className="text-sm font-medium text-gray-700">
                  {campo.label}
                </label>
                {campo.type === "textarea" ? (
                  <Textarea
                    id={id}
                    rows={3}
                    value={valores[campo.key] ?? ""}
                    onChange={(e) => atualizar(campo.key, e.target.value)}
                    maxLength={2000}
                  />
                ) : (
                  <Input
                    id={id}
                    type="text"
                    value={valores[campo.key] ?? ""}
                    onChange={(e) => atualizar(campo.key, e.target.value)}
                    maxLength={2000}
                  />
                )}
              </div>
            );
          })}
        </section>
      ))}

      <div className="sticky bottom-0 bg-gray-50 py-3 flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={salvando} className="px-5 py-2.5">
          {salvando ? "Salvando..." : "Salvar alterações"}
        </Button>
        {mensagem && (
          <p
            role={mensagem.tipo === "erro" ? "alert" : "status"}
            className={`text-sm ${mensagem.tipo === "erro" ? "text-red-600" : "text-green-700"}`}
          >
            {mensagem.texto}
          </p>
        )}
      </div>
    </form>
  );
}

function ImagemCampo({
  campo,
  url,
  onEnviada,
  onErro,
  onSucesso,
}: {
  campo: CampoVitrine;
  url: string;
  onEnviada: (url: string) => void;
  onErro: (texto: string) => void;
  onSucesso: (texto: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(file: File) {
    setEnviando(true);
    const dados = new FormData();
    dados.append("key", campo.key);
    dados.append("file", file);

    try {
      const resposta = await fetch("/api/conteudo-vitrine/imagem", { method: "POST", body: dados });
      const retorno = await resposta.json().catch(() => ({}));

      if (!resposta.ok) {
        onErro(retorno.error ?? "Não foi possível enviar a imagem. Tente de novo.");
      } else {
        onEnviada(retorno.url);
        onSucesso(`Imagem "${campo.label}" trocada na vitrine.`);
      }
    } catch {
      onErro("Sem conexão. Verifique a internet e tente de novo.");
    } finally {
      setEnviando(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-gray-700">{campo.label}</span>
      <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
        <div className="relative w-40 aspect-[4/5] rounded-lg overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
          <Image src={url} alt={`Prévia: ${campo.label}`} fill sizes="160px" className="object-cover" unoptimized />
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void enviar(file);
            }}
          />
          <Button variant="secondary" disabled={enviando} onClick={() => inputRef.current?.click()} className="self-start">
            {enviando ? "Enviando..." : "Trocar imagem"}
          </Button>
          <p className="text-xs text-gray-400">JPG, PNG ou WebP, até 5 MB. A imagem é salva assim que você escolhe o arquivo.</p>
        </div>
      </div>
    </div>
  );
}
