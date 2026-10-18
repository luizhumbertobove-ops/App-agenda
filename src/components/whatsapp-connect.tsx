"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, QrCode, X } from "lucide-react";
import { Modal } from "@/components/modal";
import { Button } from "@/components/button";

/**
 * Conecta o número do Beto ao servidor de WhatsApp: mostra o QR code para ler no celular
 * e acompanha até a conexão abrir. O QR vence em cerca de 40s, então é renovado sozinho.
 */
export function WhatsappConnect() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");

  const loadQr = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/connect");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível gerar o QR code.");
        return;
      }
      setError("");
      if (data.connected) setConnected(true);
      else setQr(data.qr ?? null);
    } catch {
      setError("Erro de conexão.");
    }
  }, []);

  // Com a janela aberta: renova o QR a cada 30s e confere a conexão a cada 5s.
  useEffect(() => {
    if (!open || connected) return;
    const first = setTimeout(loadQr, 0);
    const renew = setInterval(loadQr, 30_000);
    const check = setInterval(async () => {
      const d = await fetch("/api/messages/status")
        .then((r) => r.json())
        .catch(() => ({ online: false }));
      if (d.online) setConnected(true);
    }, 5_000);
    return () => {
      clearTimeout(first);
      clearInterval(renew);
      clearInterval(check);
    };
  }, [open, connected, loadQr]);

  function close() {
    setOpen(false);
    setQr(null);
    setError("");
    if (connected) router.refresh();
  }

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => {
          setConnected(false);
          setOpen(true);
        }}
        className="mt-3 inline-flex items-center gap-1.5"
      >
        <QrCode size={16} aria-hidden />
        Conectar WhatsApp
      </Button>

      {open && (
        <Modal onClose={close}>
          <div className="space-y-4 px-6 pt-4 pb-6">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-xl text-gray-900">Conectar WhatsApp</h3>
              <button
                type="button"
                onClick={close}
                aria-label="Fechar"
                className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            {connected ? (
              <div className="flex items-center gap-2 rounded-xl bg-green-50 p-4 text-sm text-green-700">
                <Check size={18} aria-hidden />
                WhatsApp conectado. As mensagens automáticas voltam a sair.
              </div>
            ) : (
              <>
                <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-700">
                  <li>No celular do número que envia as mensagens, abra o WhatsApp.</li>
                  <li>Toque em Configurações › Aparelhos conectados › Conectar aparelho.</li>
                  <li>Aponte a câmera para o código abaixo.</li>
                </ol>
                <div className="flex min-h-64 items-center justify-center rounded-xl border border-gray-200 bg-white p-4">
                  {error ? (
                    <p className="text-center text-sm text-red-600">{error}</p>
                  ) : qr ? (
                    // eslint-disable-next-line @next/next/no-img-element -- QR em data URL, gerado na hora
                    <img src={qr} alt="QR code para conectar o WhatsApp" className="size-60" />
                  ) : (
                    <p className="text-sm text-gray-400">Gerando o código...</p>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  O código se renova sozinho. Esta janela avisa quando a conexão abrir.
                </p>
              </>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
