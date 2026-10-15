"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Send } from "lucide-react";
import { Button } from "@/components/button";

type TipoEnvio = "confirmations" | "reengagement";

export function MessageTriggerButtons() {
  const router = useRouter();
  const [loading, setLoading] = useState<TipoEnvio | null>(null);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function trigger(type: TipoEnvio) {
    setLoading(type);
    setResult(null);
    try {
      const res = await fetch("/api/messages/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (res.ok) {
        const plural = data.sent !== 1;
        setResult({
          ok: true,
          text: `${data.sent} mensagem${plural ? "s" : ""} enviada${plural ? "s" : ""}.`,
        });
      } else {
        setResult({ ok: false, text: "Não deu para enviar agora. Tente de novo em instantes." });
      }
      router.refresh();
    } catch {
      setResult({ ok: false, text: "Não deu para conectar. Tente de novo em instantes." });
    } finally {
      setLoading(null);
      setTimeout(() => setResult(null), 5000);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 md:flex-row">
        <Button
          onClick={() => trigger("confirmations")}
          disabled={loading !== null}
          className="flex w-full items-center justify-center gap-2 md:w-auto md:flex-1"
        >
          <Send size={16} aria-hidden />
          {loading === "confirmations" ? "Enviando..." : "Enviar confirmações de amanhã"}
        </Button>
        <Button
          variant="secondary"
          onClick={() => trigger("reengagement")}
          disabled={loading !== null}
          className="flex w-full items-center justify-center gap-2 md:w-auto md:flex-1"
        >
          <Heart size={16} aria-hidden />
          {loading === "reengagement" ? "Enviando..." : "Mandar saudade para quem sumiu"}
        </Button>
      </div>
      {result && (
        <p role="status" className={`text-sm ${result.ok ? "text-green-700" : "text-red-600"}`}>
          {result.text}
        </p>
      )}
    </div>
  );
}
