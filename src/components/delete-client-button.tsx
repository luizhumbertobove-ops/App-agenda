"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/button";
import { apiRequest } from "@/lib/api-client";

export function DeleteClientButton({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setLoading(true);
    setError("");
    try {
      const r = await apiRequest(`/api/clients/${clientId}`, { method: "DELETE" }, "Erro ao excluir cliente");
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.push("/clientes");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (confirming) {
    return (
      <div className="w-full max-w-md space-y-3 rounded-xl border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-700">
          Excluir este cliente? Atendimentos e mensagens serão removidos. Os pagamentos continuam no
          Financeiro.
        </p>
        <div className="flex gap-2">
          <Button variant="danger" onClick={handleDelete} disabled={loading} className="flex-1">
            {loading ? "Excluindo..." : "Excluir"}
          </Button>
          <Button variant="secondary" onClick={() => setConfirming(false)} className="flex-1">
            Cancelar
          </Button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="flex min-h-11 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 text-sm font-medium text-red-600 transition-colors hover:border-red-200 hover:bg-red-50"
    >
      <Trash2 size={16} aria-hidden />
      Excluir cliente
    </button>
  );
}
