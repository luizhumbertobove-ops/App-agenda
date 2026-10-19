"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { WhatsappConnect } from "@/components/whatsapp-connect";

/** Aviso quando o envio automático de WhatsApp (servidor Evolution) está fora do ar. */
/** `compact`: versão curta para o Início (só o aviso e o botão de reconectar). */
export function WhatsappStatus({ compact = false }: { compact?: boolean }) {
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let vivo = true;
    fetch("/api/messages/status")
      .then((r) => r.json())
      .then((d) => vivo && setOnline(Boolean(d.online)))
      .catch(() => vivo && setOnline(false));
    return () => {
      vivo = false;
    };
  }, []);

  if (online !== false) return null;

  return (
    <div role="status" className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <WifiOff size={18} className="mt-0.5 shrink-0 text-amber-700" aria-hidden />
      <div className="text-sm text-gray-800">
        <p className="font-medium text-gray-900">
          {compact ? "WhatsApp desconectado" : "O envio automático de WhatsApp está fora do ar"}
        </p>
        <p className="mt-1">
          {compact
            ? "As confirmações automáticas não estão saindo. Reconecte pelo próprio celular."
            : "As confirmações automáticas não estão saindo. Use os botões abaixo: eles mostram quem deve receber, e você envia pelo WhatsApp do celular com a mensagem pronta."}
        </p>
        <WhatsappConnect label={compact ? "Reconectar WhatsApp" : "Conectar WhatsApp"} />
      </div>
    </div>
  );
}
