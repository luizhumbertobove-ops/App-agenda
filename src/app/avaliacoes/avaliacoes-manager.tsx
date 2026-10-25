"use client";

import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Star } from "lucide-react";
import { Button } from "@/components/button";
import { Input, Textarea } from "@/components/input";
import { Modal } from "@/components/modal";
import { apiRequest } from "@/lib/api-client";

export type AvaliacaoAdmin = {
  id: string;
  author: string;
  rating: number;
  text: string;
  status: Status;
  source: Origem;
  publishedAt: string | null;
};

type Status = "PENDING" | "APPROVED" | "HIDDEN";
type Origem = "GOOGLE" | "MANUAL";
type Mensagem = { tipo: "ok" | "erro"; texto: string };

const ABAS: { status: Status; rotulo: string; vazio: string }[] = [
  { status: "PENDING", rotulo: "Pendentes", vazio: "Nenhuma avaliação nova esperando você." },
  { status: "APPROVED", rotulo: "Aprovadas", vazio: "Nenhuma avaliação aprovada ainda." },
  { status: "HIDDEN", rotulo: "Ocultas", vazio: "Nenhuma avaliação oculta." },
];

const LIMITE_TEXTO_RECOLHIDO = 240;
const CONFIRMA_MS = 4000;
const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

export function AvaliacoesManager({ avaliacoes: iniciais }: { avaliacoes: AvaliacaoAdmin[] }) {
  const [lista, setLista] = useState<AvaliacaoAdmin[]>(iniciais);
  const [aba, setAba] = useState<Status>(() =>
    iniciais.some((a) => a.status === "PENDING") ? "PENDING" : "APPROVED"
  );
  const [mensagem, setMensagem] = useState<Mensagem | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  const contagem = (status: Status) => lista.filter((a) => a.status === status).length;
  const visiveis = lista.filter((a) => a.status === aba);
  const abaAtual = ABAS.find((a) => a.status === aba) ?? ABAS[0];

  async function mudarStatus(id: string, status: Status) {
    const anterior = lista;
    setLista((atual) => atual.map((a) => (a.id === id ? { ...a, status } : a)));
    setMensagem(null);

    const r = await apiRequest(
      `/api/avaliacoes/${id}`,
      { method: "PATCH", body: { status } },
      "Não foi possível mudar a avaliação. Tente de novo.",
    );
    if (!r.ok) {
      setLista(anterior);
      setMensagem({ tipo: "erro", texto: r.error });
      return;
    }
    setMensagem({
      tipo: "ok",
      texto:
        status === "APPROVED"
          ? "Avaliação aprovada. Ela já pode aparecer na vitrine."
          : status === "HIDDEN"
            ? "Avaliação ocultada. Ela sai da vitrine."
            : "Avaliação voltou para pendentes.",
    });
  }

  async function apagar(id: string) {
    const anterior = lista;
    setLista((atual) => atual.filter((a) => a.id !== id));
    setMensagem(null);

    const r = await apiRequest(
      `/api/avaliacoes/${id}`,
      { method: "DELETE" },
      "Não foi possível apagar a avaliação. Tente de novo.",
    );
    if (!r.ok) {
      setLista(anterior);
      setMensagem({ tipo: "erro", texto: r.error });
      return;
    }
    setMensagem({ tipo: "ok", texto: "Avaliação apagada." });
  }

  function cadastrada(avaliacao: AvaliacaoAdmin) {
    setLista((atual) => [avaliacao, ...atual]);
    setAba("APPROVED");
    setModalAberto(false);
    setMensagem({ tipo: "ok", texto: "Avaliação adicionada e aprovada. Ela já pode aparecer na vitrine." });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Situação das avaliações" className="flex flex-wrap gap-2">
          {ABAS.map(({ status, rotulo }) => {
            const ativa = status === aba;
            return (
              <button
                key={status}
                type="button"
                role="tab"
                aria-selected={ativa}
                onClick={() => {
                  setAba(status);
                  setMensagem(null);
                }}
                className={`min-h-11 rounded-full px-4 text-sm font-medium transition-colors ${
                  ativa
                    ? "bg-violet-600 text-white"
                    : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {rotulo} ({contagem(status)})
              </button>
            );
          })}
        </div>

        <Button onClick={() => setModalAberto(true)} className="inline-flex items-center gap-1.5">
          <Plus size={16} aria-hidden="true" />
          Adicionar avaliação
        </Button>
      </div>

      {aba === "APPROVED" && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-gray-700">
          A vitrine mostra as 10 melhores: maior nota primeiro, depois as mais recentes.
        </p>
      )}

      {mensagem && (
        <p
          role={mensagem.tipo === "erro" ? "alert" : "status"}
          className={`text-sm ${mensagem.tipo === "erro" ? "text-red-600" : "text-green-700"}`}
        >
          {mensagem.texto}
        </p>
      )}

      {visiveis.length === 0 ? (
        <p className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">
          {abaAtual.vazio}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {visiveis.map((avaliacao) => (
            <AvaliacaoCard
              key={avaliacao.id}
              avaliacao={avaliacao}
              onMudarStatus={(status) => void mudarStatus(avaliacao.id, status)}
              onApagar={() => void apagar(avaliacao.id)}
            />
          ))}
        </ul>
      )}

      {modalAberto && <NovaAvaliacaoModal onClose={() => setModalAberto(false)} onSalva={cadastrada} />}
    </div>
  );
}

function Estrelas({ nota }: { nota: number }) {
  return (
    <span role="img" aria-label={`${nota} de 5 estrelas`} className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => {
        const preenchida = i < nota;
        return (
          <Star
            key={i}
            size={16}
            aria-hidden="true"
            fill={preenchida ? "currentColor" : "none"}
            className={preenchida ? "text-amber-500" : "text-gray-300"}
          />
        );
      })}
    </span>
  );
}

function formataData(iso: string | null): string {
  if (!iso) return "Data desconhecida";
  // date-fns pt-BR põe ponto nas abreviações ("set."); o admin usa "13 set 2026".
  return format(new Date(iso), "d MMM yyyy", { locale: ptBR }).replace(".", "");
}

function AvaliacaoCard({
  avaliacao,
  onMudarStatus,
  onApagar,
}: {
  avaliacao: AvaliacaoAdmin;
  onMudarStatus: (status: Status) => void;
  onApagar: () => void;
}) {
  const [expandida, setExpandida] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const longa = avaliacao.text.length > LIMITE_TEXTO_RECOLHIDO;

  useEffect(() => {
    if (!confirmando) return;
    const timer = setTimeout(() => setConfirmando(false), CONFIRMA_MS);
    return () => clearTimeout(timer);
  }, [confirmando]);

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-gray-900">{avaliacao.author}</p>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
          {avaliacao.source === "GOOGLE" ? "Google" : "Manual"}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
        <Estrelas nota={avaliacao.rating} />
        <span>{formataData(avaliacao.publishedAt)}</span>
      </div>

      {avaliacao.text && (
        <div className="flex flex-col items-start gap-1">
          <p className={`whitespace-pre-line text-sm text-gray-700 ${expandida ? "" : "line-clamp-4"}`}>
            {avaliacao.text}
          </p>
          {longa && (
            <button
              type="button"
              onClick={() => setExpandida((v) => !v)}
              aria-expanded={expandida}
              className="min-h-11 px-1 text-sm font-medium text-violet-700 hover:underline"
            >
              {expandida ? "Mostrar menos" : "Ler tudo"}
            </button>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {avaliacao.status === "PENDING" && (
          <>
            <Button onClick={() => onMudarStatus("APPROVED")}>Aprovar</Button>
            <Button variant="secondary" onClick={() => onMudarStatus("HIDDEN")}>
              Ocultar
            </Button>
          </>
        )}
        {avaliacao.status === "APPROVED" && (
          <Button variant="secondary" onClick={() => onMudarStatus("HIDDEN")}>
            Ocultar
          </Button>
        )}
        {avaliacao.status === "HIDDEN" && <Button onClick={() => onMudarStatus("APPROVED")}>Aprovar</Button>}

        {avaliacao.source === "MANUAL" &&
          (confirmando ? (
            <button
              type="button"
              onClick={onApagar}
              className="min-h-11 rounded-full bg-red-600 px-4 text-sm font-medium text-white transition-colors hover:bg-red-700"
            >
              Confirmar exclusão
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmando(true)}
              className="min-h-11 rounded-full px-4 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              Apagar
            </button>
          ))}
      </div>
    </li>
  );
}

function NovaAvaliacaoModal({
  onClose,
  onSalva,
}: {
  onClose: () => void;
  onSalva: (avaliacao: AvaliacaoAdmin) => void;
}) {
  const [autor, setAutor] = useState("");
  const [nota, setNota] = useState(5);
  const [data, setData] = useState("");
  const [texto, setTexto] = useState("");
  const [erros, setErros] = useState<{ autor?: string; data?: string }>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  function escolherNota(valor: number) {
    setNota(Math.min(5, Math.max(1, valor)));
  }

  function teclasDaNota(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      escolherNota(nota + 1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      escolherNota(nota - 1);
    }
  }

  async function salvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErroGeral(null);

    const nomeLimpo = autor.trim();
    const novosErros: { autor?: string; data?: string } = {};
    if (!nomeLimpo) novosErros.autor = "Escreva o nome de quem avaliou.";
    else if (nomeLimpo.length > 120) novosErros.autor = "Nome muito longo (máximo de 120 caracteres).";
    if (data && !DATA_ISO.test(data)) novosErros.data = "Data inválida.";
    setErros(novosErros);
    if (Object.keys(novosErros).length > 0) return;

    setSalvando(true);
    try {
      const r = await apiRequest<{ avaliacao: AvaliacaoAdmin }>(
        "/api/avaliacoes",
        {
          method: "POST",
          body: {
            author: nomeLimpo,
            rating: nota,
            text: texto.trim(),
            publishedAt: data || null,
          },
        },
        "Não foi possível salvar. Tente de novo.",
      );
      if (!r.ok) {
        setErroGeral(r.error);
        return;
      }
      onSalva(r.data.avaliacao);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal onClose={onClose} maxWidth="md">
      <form onSubmit={salvar} noValidate className="flex flex-col gap-5 p-6">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-2xl text-gray-900">Adicionar avaliação</h2>
          <p className="text-sm text-gray-500">
            Copie do Google a avaliação que quer mostrar. Ela já entra aprovada.
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="av-nome" className="text-sm font-medium text-gray-700">
            Nome
          </label>
          <Input
            id="av-nome"
            value={autor}
            maxLength={120}
            onChange={(e) => setAutor(e.target.value)}
            aria-invalid={!!erros.autor}
            aria-describedby={erros.autor ? "av-nome-erro" : undefined}
          />
          {erros.autor && (
            <p id="av-nome-erro" className="text-sm text-red-600">
              {erros.autor}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <span id="av-nota-rotulo" className="text-sm font-medium text-gray-700">
            Nota
          </span>
          <div
            role="radiogroup"
            aria-labelledby="av-nota-rotulo"
            onKeyDown={teclasDaNota}
            className="flex gap-1"
          >
            {[1, 2, 3, 4, 5].map((n) => {
              const marcada = n === nota;
              return (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={marcada}
                  aria-label={n === 1 ? "1 estrela" : `${n} estrelas`}
                  tabIndex={marcada ? 0 : -1}
                  onClick={() => escolherNota(n)}
                  className="flex size-11 items-center justify-center rounded-full transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
                >
                  <Star
                    size={24}
                    aria-hidden="true"
                    fill={n <= nota ? "currentColor" : "none"}
                    className={n <= nota ? "text-amber-500" : "text-gray-300"}
                  />
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="av-data" className="text-sm font-medium text-gray-700">
            Data <span className="font-normal text-gray-400">(opcional)</span>
          </label>
          <Input
            id="av-data"
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            aria-invalid={!!erros.data}
            aria-describedby={erros.data ? "av-data-erro" : undefined}
            className="max-w-xs"
          />
          {erros.data && (
            <p id="av-data-erro" className="text-sm text-red-600">
              {erros.data}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="av-texto" className="text-sm font-medium text-gray-700">
            Texto <span className="font-normal text-gray-400">(opcional)</span>
          </label>
          <Textarea
            id="av-texto"
            rows={4}
            value={texto}
            maxLength={5000}
            onChange={(e) => setTexto(e.target.value)}
          />
        </div>

        {erroGeral && (
          <p role="alert" className="text-sm text-red-600">
            {erroGeral}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar avaliação"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
