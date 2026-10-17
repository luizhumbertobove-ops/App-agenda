"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/** Aviso quando o envio automático de WhatsApp (servidor Evolution) está fora do ar. */
export function WhatsappStatus() {
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
        <p className="font-medium text-gray-900">O envio automático de WhatsApp está fora do ar</p>
        <p className="mt-1">
          As confirmações automáticas não estão saindo. Use os botões abaixo: eles mostram quem deve
          receber, e você envia pelo WhatsApp do celular com a mensagem pronta.
        </p>
      </div>
    </div>
  );
}
