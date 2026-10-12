"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, UserPlus } from "lucide-react";

export function MessageTriggerButtons() {
  const router = useRouter();
  const [loading, setLoading] = useState<"confirmations" | "reengagement" | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function trigger(type: "confirmations" | "reengagement") {
    setLoading(type);
    setResult(null);
    try {
      const res = await fetch("/api/messages/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      setResult(res.ok ? `${data.sent} mensagem${data.sent !== 1 ? "s" : ""} enviada${data.sent !== 1 ? "s" : ""}` : "Erro ao enviar");
      router.refresh();
    } catch {
      setResult("Erro de conexão");
    } finally {
      setLoading(null);
      setTimeout(() => setResult(null), 5000);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={() => trigger("confirmations")}
        disabled={loading !== null}
        className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 text-sm font-medium rounded-lg transition-colors"
      >
        <Send size={14} />
        {loading === "confirmations" ? "Enviando..." : "Enviar confirmações agora"}
      </button>
      <button
        onClick={() => trigger("reengagement")}
        disabled={loading !== null}
        className="flex items-center gap-2 px-3 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 disabled:opacity-50 text-sm font-medium rounded-lg transition-colors"
      >
        <UserPlus size={14} />
        {loading === "reengagement" ? "Enviando..." : "Enviar reengajamento agora"}
      </button>
      {result && <span className="text-sm text-gray-600">{result}</span>}
    </div>
  );
}
