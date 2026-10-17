"use client";

import { useState } from "react";
import { MessageSquare, X, Send, Check } from "lucide-react";
import { Modal } from "@/components/modal";
import { Button } from "@/components/button";
import { Textarea } from "@/components/input";

type MessageType = "confirmation" | "reengagement" | "custom";

const TYPE_LABELS: Record<MessageType, string> = {
  confirmation: "Confirmação de atendimento",
  reengagement: "Reengajamento",
  custom: "Mensagem personalizada",
};

export function SendWhatsappModal({
  clientId,
  clientName,
}: {
  clientId: string;
  clientName: string;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<MessageType>("reengagement");
  const [customMessage, setCustomMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  // Servidor fora do ar: link para enviar pelo WhatsApp do aparelho.
  const [manual, setManual] = useState<{ link: string; message: string; logType: string } | null>(null);

  async function handleSend() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/messages/send-to-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, type, customMessage }),
      });
      if (!res.ok) {
        const data = await res.json();
        if (data.offline) {
          setManual({ link: data.link, message: data.message, logType: data.logType });
          return;
        }
        setError(data.error ?? "Erro ao enviar mensagem");
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        setCustomMessage("");
        setType("reengagement");
      }, 1500);
    } catch {
      setError("Erro de conexão");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full border border-gray-200 bg-white px-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
      >
        <MessageSquare size={16} aria-hidden />
        WhatsApp
      </button>

      {open && (
        <Modal onClose={() => setOpen(false)}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <h3 className="font-display text-xl text-gray-900">Enviar mensagem</h3>
              <p className="mt-0.5 text-sm text-gray-500">{clientName}</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Fechar"
              className="flex h-11 w-11 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Type selector */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">
                Tipo de mensagem
              </label>
              <div className="flex flex-col gap-2">
                {(["reengagement", "confirmation", "custom"] as MessageType[]).map((t) => (
                  <label
                    key={t}
                    className={`flex min-h-11 items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                      type === t
                        ? "border-violet-300 bg-violet-50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="msg-type"
                      value={t}
                      checked={type === t}
                      onChange={() => setType(t)}
                      className="accent-violet-600"
                    />
                    <span className="text-sm text-gray-700">{TYPE_LABELS[t]}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Custom message textarea */}
            {type === "custom" && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Mensagem
                </label>
                <Textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={4}
                  placeholder={`Olá ${clientName}! ...`}
                />
              </div>
            )}

            {manual && (
              <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm text-gray-800">
                  O envio automático está fora do ar. Abra o WhatsApp com a mensagem pronta e envie por lá.
                </p>
                <a
                  href={manual.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    fetch("/api/messages/manual-log", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ clientId, type: manual.logType, message: manual.message }),
                    }).catch(() => {});
                    setOpen(false);
                    setManual(null);
                  }}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-violet-600 text-sm font-medium text-white hover:bg-violet-700"
                >
                  <MessageSquare size={16} aria-hidden />
                  Abrir no WhatsApp
                </a>
              </div>
            )}

            {error && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            {success && (
              <p className="flex items-center gap-1.5 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
                <Check size={14} aria-hidden />
                Mensagem enviada.
              </p>
            )}

            <Button
              onClick={handleSend}
              disabled={loading || success}
              className="flex w-full items-center justify-center gap-2"
            >
              <Send size={16} aria-hidden />
              {loading ? "Enviando..." : "Enviar pelo WhatsApp"}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
