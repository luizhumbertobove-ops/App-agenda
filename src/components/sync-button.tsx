"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/button";

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
      {result && <span className="text-sm text-gray-600">{result}</span>}
      <Button onClick={handleSync} disabled={loading} className="flex items-center gap-2">
        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        Sincronizar agenda
      </Button>
    </div>
  );
}
