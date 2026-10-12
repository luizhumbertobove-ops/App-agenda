"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function ClearAgendaButton() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleClear() {
    setLoading(true);
    try {
      await fetch("/api/appointments?confirm=true", { method: "DELETE" });
      setConfirming(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
        <span className="text-xs text-red-700 font-medium">Apagar todos os agendamentos?</span>
        <button
          onClick={handleClear}
          disabled={loading}
          className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? "Apagando..." : "Confirmar"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs px-2 py-1 border border-gray-200 rounded hover:bg-gray-50 text-gray-600"
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 transition-colors"
    >
      <Trash2 size={13} />
      Limpar agenda
    </button>
  );
}
