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
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-red-600">Excluir?</span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-xs px-1.5 py-0.5 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
        >
          Sim
        </button>
        <button
          onClick={() => setConfirmingDelete(false)}
          className="text-xs px-1.5 py-0.5 border border-gray-200 rounded hover:bg-gray-50"
        >
          Não
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={markPaid}
        disabled={loading}
        title="Marcar como pago"
        className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50 font-medium transition-colors"
      >
        <Check size={11} />
        Pago
      </button>
      <button
        onClick={() => setConfirmingDelete(true)}
        disabled={loading}
        title="Excluir"
        className="text-gray-400 hover:text-red-600 disabled:opacity-50 transition-colors"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}
