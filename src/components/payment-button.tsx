"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { formatCurrencyBR } from "@/lib/format";

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

  async function handleSend() {
    if (!confirm(`Enviar link de pagamento de ${formatCurrencyBR(amount)} para ${clientName}?`)) return;
    setLoading(true);
    try {
      const res = await fetch("/api/payments/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId, clientId, amount }),
      });
      if (res.ok) setSent(true);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return <span className="text-xs text-green-600 font-medium">Enviado ✓</span>;
  }

  return (
    <button
      onClick={handleSend}
      disabled={loading}
      className="flex items-center gap-1 px-2 py-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
    >
      <Send size={11} />
      {loading ? "..." : "Pix"}
    </button>
  );
}
