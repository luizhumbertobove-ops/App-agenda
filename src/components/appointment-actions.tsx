"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Status = "SCHEDULED" | "CONFIRMED" | "DONE" | "CANCELLED";

export function AppointmentActions({
  appointmentId,
  status,
}: {
  appointmentId: string;
  status: Status;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  if (status === "DONE" || status === "CANCELLED") return null;

  async function updateStatus(newStatus: Status, extra?: Record<string, string>) {
    setLoading(true);
    try {
      await fetch(`/api/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, ...extra }),
      });
      router.refresh();
    } finally {
      setLoading(false);
      setCancelling(false);
    }
  }

  if (cancelling) {
    return (
      <div className="flex items-center gap-2">
        <input
          autoFocus
          type="text"
          placeholder="Motivo (opcional)"
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          className="text-xs border border-gray-200 rounded px-2 py-1 w-36 focus:outline-none focus:ring-1 focus:ring-red-300"
          onKeyDown={(e) => {
            if (e.key === "Enter") updateStatus("CANCELLED", { cancelReason });
            if (e.key === "Escape") setCancelling(false);
          }}
        />
        <button
          onClick={() => updateStatus("CANCELLED", { cancelReason })}
          disabled={loading}
          className="text-xs px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
        >
          {loading ? "..." : "Confirmar"}
        </button>
        <button
          onClick={() => setCancelling(false)}
          className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200"
        >
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {status === "SCHEDULED" && (
        <button
          onClick={() => updateStatus("CONFIRMED")}
          disabled={loading}
          className="text-xs px-2 py-1 rounded-md bg-green-100 text-green-700 hover:bg-green-200 font-medium disabled:opacity-50 transition-colors"
        >
          Confirmar
        </button>
      )}
      <button
        onClick={() => updateStatus("DONE")}
        disabled={loading}
        className="text-xs px-2 py-1 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium disabled:opacity-50 transition-colors"
      >
        Concluir
      </button>
      <button
        onClick={() => updateStatus("CANCELLED", { cancelReason: "Não compareceu", noShow: "true" })}
        disabled={loading}
        className="text-xs px-2 py-1 rounded-md bg-orange-50 text-orange-600 hover:bg-orange-100 font-medium disabled:opacity-50 transition-colors"
        title="Marcar como não compareceu e enviar mensagem"
      >
        Faltou
      </button>
      <button
        onClick={() => setCancelling(true)}
        disabled={loading}
        className="text-xs px-2 py-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100 font-medium disabled:opacity-50 transition-colors"
      >
        Cancelar
      </button>
    </div>
  );
}
