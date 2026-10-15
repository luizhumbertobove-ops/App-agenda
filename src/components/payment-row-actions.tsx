"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Trash2 } from "lucide-react";

export function PaymentRowActions({
  paymentId,
  status,
}: {
  paymentId: string;
  status: "PENDING" | "SENT" | "PAID" | "OVERDUE";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function markPaid() {
    setLoading(true);
    try {
      await fetch(`/api/payments/${paymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAID" }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setLoading(true);
    try {
      await fetch(`/api/payments/${paymentId}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setLoading(false);
      setConfirmingDelete(false);
    }
  }

  if (status === "PAID") {
    return null;
  }

  if (confirmingDelete) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-red-600">Excluir?</span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="min-h-11 px-4 rounded-full bg-red-600 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          Sim
        </button>
        <button
          onClick={() => setConfirmingDelete(false)}
          className="min-h-11 px-4 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Não
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={markPaid}
        disabled={loading}
        title="Marcar como pago"
        className="flex min-h-11 items-center gap-1.5 px-4 rounded-full bg-green-50 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-50 transition-colors"
      >
        <Check size={14} aria-hidden />
        Pago
      </button>
      <button
        onClick={() => setConfirmingDelete(true)}
        disabled={loading}
        title="Excluir"
        aria-label="Excluir cobrança"
        className="flex h-11 w-11 items-center justify-center rounded-full text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 transition-colors"
      >
        <Trash2 size={16} aria-hidden />
      </button>
    </div>
  );
}
