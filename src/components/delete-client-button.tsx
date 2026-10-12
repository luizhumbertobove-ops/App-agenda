"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function DeleteClientButton({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/clients/${clientId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Erro ao excluir cliente");
        return;
      }
      router.push("/clientes");
      router.refresh();
    } catch {
      setError("Erro de conexão");
    } finally {
      setLoading(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
          <span className="text-xs text-red-700 font-medium max-w-[220px]">
            Excluir cliente? Atendimentos e mensagens serão removidos. Pagamentos ficam preservados no Financeiro.
          </span>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "Excluindo..." : "Confirmar"}
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="text-xs px-2 py-1 border border-gray-200 rounded hover:bg-gray-50 text-gray-600"
          >
            Cancelar
          </button>
        </div>
        {error && <p className="text-xs text-red-600 max-w-xs text-right">{error}</p>}
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-500 hover:text-red-700 border border-gray-200 rounded-lg hover:bg-red-50"
    >
      <Trash2 size={13} />
      Excluir
    </button>
  );
}
