"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, QrCode, X } from "lucide-react";
import { Modal } from "@/components/modal";
import { Button } from "@/components/button";
import { Input } from "@/components/input";

type Mode = "qr" | "code";

/**
 * Conecta o número do Beto ao servidor de WhatsApp. Dois jeitos:
 * - QR code: lido pela câmera de outro aparelho (o QR vence em ~40s e é renovado sozinho);
 * - código de 8 letras: digitado no próprio celular, sem precisar de outra tela.
 * A janela acompanha até a conexão abrir.
 */
export function WhatsappConnect({ label = "Conectar WhatsApp" }: { label?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("code");
  const [qr, setQr] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [loadingCode, setLoadingCode] = useState(false);
  const [copied, setCopied] = useState(false);
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
      setPhone((p) => p || data.defaultPhone || "");
    } catch {
      setError("Erro de conexão.");
    }
  }, []);

  async function loadCode() {
    setLoadingCode(true);
    setError("");
    setCopied(false);
    try {
      const res = await fetch(`/api/whatsapp/connect?phone=${encodeURIComponent(phone)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível gerar o código.");
      } else if (data.connected) {
        setConnected(true);
      } else if (data.pairingCode) {
        setPairingCode(data.pairingCode);
      } else {
        setError("O servidor não devolveu o código. Tente de novo ou use o QR code.");
      }
    } catch {
      setError("Erro de conexão.");
    } finally {
      setLoadingCode(false);
    }
  }

  // Com a janela aberta: no modo QR renova o código a cada 30s; nos dois modos confere a conexão a cada 5s.
  useEffect(() => {
    if (!open || connected) return;
    const first = setTimeout(loadQr, 0);
    const renew = mode === "qr" ? setInterval(loadQr, 30_000) : undefined;
    const check = setInterval(async () => {
      const d = await fetch("/api/messages/status")
        .then((r) => r.json())
        .catch(() => ({ online: false }));
      if (d.online) setConnected(true);
    }, 5_000);
    return () => {
      clearTimeout(first);
      if (renew) clearInterval(renew);
      clearInterval(check);
    };
  }, [open, connected, mode, loadQr]);

  function close() {
    setOpen(false);
    setQr(null);
    setPairingCode(null);
    setError("");
    if (connected) router.refresh();
  }

  const tab = (active: boolean) =>
    `inline-flex min-h-11 flex-1 items-center justify-center rounded-full px-3 text-sm font-medium transition-colors ${
      active ? "bg-violet-600 text-white" : "text-gray-600 hover:text-gray-900"
    }`;

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => {
          setConnected(false);
          setPairingCode(null);
          setOpen(true);
        }}
        className="mt-3 inline-flex items-center gap-1.5"
      >
        <QrCode size={16} aria-hidden />
        {label}
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
                <div className="flex gap-1 rounded-full border border-gray-200 bg-white p-1">
                  <button type="button" onClick={() => setMode("code")} className={tab(mode === "code")}>
                    Código no celular
                  </button>
                  <button type="button" onClick={() => setMode("qr")} className={tab(mode === "qr")}>
                    QR code
                  </button>
                </div>

                {mode === "code" ? (
                  <>
                    <p className="text-sm text-gray-700">
                      Para conectar só com o celular, sem outra tela por perto.
                    </p>
                    {!pairingCode ? (
                      <div className="space-y-3">
                        <div>
                          <label htmlFor="wa-numero" className="mb-1.5 block text-sm font-medium text-gray-700">
                            Número do WhatsApp que envia as mensagens
                          </label>
                          <Input
                            id="wa-numero"
                            inputMode="numeric"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="5516999999999"
                            className="min-h-11"
                          />
                        </div>
                        <Button
                          onClick={loadCode}
                          disabled={loadingCode || phone.replace(/\D/g, "").length < 10}
                          className="w-full"
                        >
                          {loadingCode ? "Gerando..." : "Gerar código"}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4">
                          <span className="font-mono text-2xl tracking-[0.2em] text-gray-900">
                            {pairingCode.slice(0, 4)}-{pairingCode.slice(4)}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard?.writeText(pairingCode).then(() => setCopied(true)).catch(() => {});
                            }}
                            className="flex min-h-11 items-center gap-1.5 rounded-full border border-gray-200 px-3 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
                            {copied ? "Copiado" : "Copiar"}
                          </button>
                        </div>
                        <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-700">
                          <li>Abra o WhatsApp desse número.</li>
                          <li>Configurações › Aparelhos conectados › Conectar aparelho.</li>
                          <li>Toque em &quot;Conectar com número de telefone&quot; e digite o código.</li>
                        </ol>
                        <button
                          type="button"
                          onClick={loadCode}
                          className="text-sm font-medium text-violet-700 underline"
                        >
                          O código venceu? Gerar outro
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-700">
                      <li>No celular do número que envia as mensagens, abra o WhatsApp.</li>
                      <li>Toque em Configurações › Aparelhos conectados › Conectar aparelho.</li>
                      <li>Aponte a câmera para o código abaixo.</li>
                    </ol>
                    <div className="flex min-h-64 items-center justify-center rounded-xl border border-gray-200 bg-white p-4">
                      {qr ? (
                        // eslint-disable-next-line @next/next/no-img-element -- QR em data URL, gerado na hora
                        <img src={qr} alt="QR code para conectar o WhatsApp" className="size-60" />
                      ) : (
                        !error && <p className="text-sm text-gray-400">Gerando o código...</p>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">O código se renova sozinho.</p>
                  </>
                )}

                {error && <p className="text-center text-sm text-red-600">{error}</p>}
                <p className="text-xs text-gray-500">Esta janela avisa quando a conexão abrir.</p>
              </>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
