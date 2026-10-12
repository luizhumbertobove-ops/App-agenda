"use client";

import { useState } from "react";
import { MessageSquare, X, Send } from "lucide-react";
import { Modal } from "@/components/modal";
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
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-green-600 hover:text-green-700 border border-gray-200 rounded-lg hover:bg-green-50 transition-colors"
      >
        <MessageSquare size={14} />
        WhatsApp
      </button>

      {open && (
        <Modal onClose={() => setOpen(false)}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Enviar mensagem</h3>
              <p className="text-xs text-gray-400 mt-0.5">{clientName}</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Fechar" className="text-gray-400 hover:text-gray-600">
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
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
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

            {error && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            {success && (
              <p className="text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2">
                ✓ Mensagem enviada com sucesso!
              </p>
            )}

            <button
              onClick={handleSend}
              disabled={loading || success}
              className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <Send size={14} />
              {loading ? "Enviando..." : "Enviar via WhatsApp"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
