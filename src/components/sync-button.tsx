"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";

export function SyncButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleSync() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/calendar/sync", { method: "POST" });
      const data = await res.json();
      setResult(data.ok ? `${data.processed} eventos sincronizados` : "Erro ao sincronizar");
    } catch {
      setResult("Erro de conexão");
    } finally {
      setLoading(false);
      setTimeout(() => setResult(null), 4000);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {result && (
        <span role="status" className="text-sm text-gray-500">
          {result}
        </span>
      )}
      <button
        type="button"
        onClick={handleSync}
        disabled={loading}
        aria-label="Sincronizar agenda"
        title="Sincronizar agenda"
        className="flex size-11 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50"
      >
        <RefreshCw size={18} strokeWidth={1.75} className={loading ? "animate-spin" : ""} />
      </button>
    </div>
  );
}
