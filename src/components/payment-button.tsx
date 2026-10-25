"use client";

import { useState } from "react";
import { Check, Send } from "lucide-react";
import { formatCurrencyBR } from "@/lib/format";
import { apiRequest } from "@/lib/api-client";

export function PaymentButton({
  appointmentId,
  clientId,
  amount,
  clientName,
}: {
  appointmentId?: string;
  clientId?: string;
  amount: number;
  clientName: string;
}) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSend() {
    if (!confirm(`Enviar link de pagamento de ${formatCurrencyBR(amount)} para ${clientName}?`)) return;
    setLoading(true);
    setError("");
    try {
      const r = await apiRequest("/api/payments/send", {
        method: "POST",
        body: { appointmentId, clientId, amount },
      }, "Não consegui enviar o Pix. Tente de novo.");
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <span className="flex min-h-11 shrink-0 items-center gap-1 text-sm font-medium text-green-700">
        <Check size={16} aria-hidden />
        Enviado
      </span>
    );
  }

  return (
    <>
      <button
        onClick={handleSend}
        disabled={loading}
        className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-violet-300 bg-white px-4 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-50 disabled:opacity-50"
      >
        <Send size={16} aria-hidden />
        {loading ? "Enviando..." : "Enviar Pix"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </>
  );
}
