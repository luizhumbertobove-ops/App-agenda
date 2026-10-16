"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Package, X } from "lucide-react";
import { Modal } from "@/components/modal";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { formatCurrencyBR } from "@/lib/format";

/** Vende um pacote de sessões (ex.: 4 sessões pagas de uma vez na primeira). */
export function SellPlanModal({ clientId, clientName }: { clientId: string; clientName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sessions, setSessions] = useState("4");
  const [amount, setAmount] = useState("");
  const [paid, setPaid] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const n = parseInt(sessions);
  const value = Number(amount.replace(/\./g, "").replace(",", "."));
  const valid = Number.isInteger(n) && n >= 2 && n <= 50 && Number.isFinite(value) && value > 0;

  async function handleSave() {
    if (!valid) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/clients/${clientId}/plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessions: n, amount: value, paid }),
      });
      if (!res.ok) {
        setError("Não foi possível registrar o pacote.");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Erro de conexão.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSessions("4");
          setAmount("");
          setPaid(true);
          setError("");
          setOpen(true);
        }}
        className="flex min-h-11 items-center gap-1.5 rounded-full border border-violet-300 bg-white px-4 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-50"
      >
        <Package size={16} aria-hidden />
        Vender pacote
      </button>

      {open && (
        <Modal onClose={() => setOpen(false)}>
          <div className="space-y-5 px-6 pt-4 pb-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-display text-xl text-gray-900">Vender pacote</h3>
                <p className="truncate text-sm text-gray-500">{clientName}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="pacote-sessoes" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Sessões
                </label>
                <Input
                  id="pacote-sessoes"
                  inputMode="numeric"
                  value={sessions}
                  onChange={(e) => setSessions(e.target.value.replace(/[^0-9]/g, ""))}
                  className="min-h-11"
                />
              </div>
              <div>
                <label htmlFor="pacote-valor" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Valor total (R$)
                </label>
                <Input
                  id="pacote-valor"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="min-h-11"
                />
              </div>
            </div>
            {valid && (
              <p className="-mt-2 text-xs text-gray-500">
                {formatCurrencyBR(value / n)} por sessão. O valor entra uma vez no Financeiro; as próximas
                sessões são concluídas pelo pacote, sem nova cobrança.
              </p>
            )}

            <fieldset className="space-y-2">
              <legend className="mb-2 text-sm font-medium text-gray-700">Pagamento</legend>
              {[
                { v: true, label: "Já recebi", hint: "Entra como recebido no Financeiro" },
                { v: false, label: "A receber", hint: "Fica pendente para enviar o Pix depois" },
              ].map((o) => (
                <label
                  key={o.label}
                  className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                    paid === o.v ? "border-violet-300 bg-violet-50" : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="pacote-pagamento"
                    checked={paid === o.v}
                    onChange={() => setPaid(o.v)}
                    className="accent-violet-600"
                  />
                  <span>
                    <span className="block text-sm text-gray-900">{o.label}</span>
                    <span className="block text-xs text-gray-500">{o.hint}</span>
                  </span>
                </label>
              ))}
            </fieldset>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

            <Button onClick={handleSave} disabled={saving || !valid} className="w-full">
              {saving ? "Registrando..." : "Registrar pacote"}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
