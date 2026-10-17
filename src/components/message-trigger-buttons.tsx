"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Heart, MessageCircle, Send, X } from "lucide-react";
import { Button } from "@/components/button";
import { Modal } from "@/components/modal";

type TipoEnvio = "confirmations" | "reengagement";
type Target = {
  clientId: string;
  clientName: string;
  phone: string;
  message: string;
  appointmentId?: string;
  link: string;
};

const TITULO: Record<TipoEnvio, string> = {
  confirmations: "Confirmações de amanhã",
  reengagement: "Saudade para quem sumiu",
};

export function MessageTriggerButtons() {
  const router = useRouter();
  const [loading, setLoading] = useState<TipoEnvio | null>(null);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  // Servidor fora do ar: lista para enviar um por um pelo WhatsApp do aparelho.
  const [manual, setManual] = useState<{ type: TipoEnvio; targets: Target[] } | null>(null);
  const [enviados, setEnviados] = useState<Set<string>>(new Set());

  async function trigger(type: TipoEnvio) {
    setLoading(type);
    setResult(null);
    try {
      const res = await fetch("/api/messages/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (data.offline) {
        if (data.targets.length === 0) {
          setResult({ ok: true, text: "Ninguém para receber agora." });
        } else {
          setEnviados(new Set());
          setManual({ type, targets: data.targets });
        }
      } else if (res.ok) {
        const plural = data.sent !== 1;
        setResult({
          ok: true,
          text: `${data.sent} mensagem${plural ? "s" : ""} enviada${plural ? "s" : ""}.`,
        });
        router.refresh();
      } else {
        setResult({ ok: false, text: "Não deu para enviar agora. Tente de novo em instantes." });
      }
    } catch {
      setResult({ ok: false, text: "Não deu para conectar. Tente de novo em instantes." });
    } finally {
      setLoading(null);
      setTimeout(() => setResult(null), 5000);
    }
  }

  // Ao tocar em "Abrir no WhatsApp", registra o envio (histórico, contadores e não repetir).
  function registrar(t: Target) {
    const key = t.appointmentId ?? t.clientId;
    setEnviados((s) => new Set(s).add(key));
    fetch("/api/messages/manual-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: t.clientId,
        type: manual?.type === "confirmations" ? "CONFIRMATION" : "REENGAGEMENT",
        message: t.message,
        appointmentId: t.appointmentId,
      }),
    }).catch(() => {});
  }

  function fecharManual() {
    setManual(null);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 md:flex-row">
        <Button
          onClick={() => trigger("confirmations")}
          disabled={loading !== null}
          className="flex w-full items-center justify-center gap-2 md:w-auto md:flex-1"
        >
          <Send size={16} aria-hidden />
          {loading === "confirmations" ? "Preparando..." : "Enviar confirmações de amanhã"}
        </Button>
        <Button
          variant="secondary"
          onClick={() => trigger("reengagement")}
          disabled={loading !== null}
          className="flex w-full items-center justify-center gap-2 md:w-auto md:flex-1"
        >
          <Heart size={16} aria-hidden />
          {loading === "reengagement" ? "Preparando..." : "Mandar saudade para quem sumiu"}
        </Button>
      </div>
      {result && (
        <p role="status" className={`text-sm ${result.ok ? "text-green-700" : "text-red-600"}`}>
          {result.text}
        </p>
      )}

      {manual && (
        <Modal onClose={fecharManual} maxWidth="lg">
          <div className="space-y-4 px-6 pt-4 pb-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-display text-xl text-gray-900">{TITULO[manual.type]}</h3>
                <p className="mt-1 text-sm text-gray-500">
                  O envio automático está fora do ar. Toque em cada pessoa para abrir o WhatsApp com a
                  mensagem pronta e enviar.
                </p>
              </div>
              <button
                type="button"
                onClick={fecharManual}
                aria-label="Fechar"
                className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-sm text-gray-700">
              {enviados.size} de {manual.targets.length} enviadas
            </p>

            <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
              {manual.targets.map((t) => {
                const key = t.appointmentId ?? t.clientId;
                const feito = enviados.has(key);
                return (
                  <li key={key} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium text-gray-900">{t.clientName}</p>
                      <p className="line-clamp-2 text-xs text-gray-500">{t.message}</p>
                    </div>
                    {feito ? (
                      <span className="flex min-h-11 shrink-0 items-center gap-1 text-sm font-medium text-green-700">
                        <Check size={16} aria-hidden />
                        Aberto
                      </span>
                    ) : (
                      <a
                        href={t.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => registrar(t)}
                        className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-violet-600 px-4 text-sm font-medium text-white hover:bg-violet-700"
                      >
                        <MessageCircle size={16} aria-hidden />
                        Abrir no WhatsApp
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </Modal>
      )}
    </div>
  );
}
