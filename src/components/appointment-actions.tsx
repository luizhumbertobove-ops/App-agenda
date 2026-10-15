"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, X } from "lucide-react";
import { Modal } from "@/components/modal";
import { Input } from "@/components/input";
import { Button } from "@/components/button";

type Status = "SCHEDULED" | "CONFIRMED" | "DONE" | "CANCELLED";
type ChargeMode = "paid" | "pending" | "none";

const CHARGE_OPTIONS: { value: ChargeMode; label: string; hint: string }[] = [
  { value: "paid", label: "Já recebi", hint: "Entra como recebido no Financeiro" },
  { value: "pending", label: "A receber", hint: "Fica pendente para enviar o Pix depois" },
  { value: "none", label: "Não cobrar", hint: "Sessão de plano ou cortesia" },
];

const BTN_BASE =
  "inline-flex min-h-11 md:min-h-9 items-center justify-center rounded-full px-4 text-sm font-medium transition-colors disabled:opacity-50";
const BTN_PRIMARY = `${BTN_BASE} bg-violet-600 text-white hover:bg-violet-700`;
const BTN_SECONDARY = `${BTN_BASE} border border-gray-300 bg-white text-gray-700 hover:bg-gray-50`;

export function AppointmentActions({
  appointmentId,
  status,
  startTime,
  serverNow,
  defaultAmount,
}: {
  appointmentId: string;
  status: Status;
  startTime: string;
  /** Valor sugerido ao concluir: cobrança em aberto do atendimento ou preço do serviço. */
  defaultAmount?: number | null;
  /** Horário do render no servidor: o primeiro render do navegador usa o mesmo valor, sem erro de hidratação. */
  serverNow: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [now, setNow] = useState(serverNow);
  const [completing, setCompleting] = useState(false);
  const [amount, setAmount] = useState(defaultAmount ? String(defaultAmount) : "");
  const [chargeMode, setChargeMode] = useState<ChargeMode>("paid");
  const [reopening, setReopening] = useState(false);
  const [notice, setNotice] = useState("");

  // Relógio atualizado a cada minuto: troca "Confirmar" por "Concluiu/Faltou" quando o horário chega.
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 60_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  if (status === "CANCELLED") return null;

  const started = now >= new Date(startTime).getTime();

  async function updateStatus(newStatus: Status, extra?: Record<string, unknown>) {
    setLoading(true);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, ...extra }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.keptPayments > 0) {
        setNotice("O Pix pago pelo Mercado Pago foi mantido no Financeiro.");
      }
      router.refresh();
    } finally {
      setLoading(false);
      setCancelling(false);
      setCompleting(false);
      setReopening(false);
    }
  }

  const amountNumber = Number(amount.replace(",", "."));
  const amountValid = chargeMode === "none" || (Number.isFinite(amountNumber) && amountNumber > 0);

  function confirmCompletion() {
    if (!amountValid) return;
    updateStatus("DONE", {
      charge: chargeMode === "none" ? null : { amount: amountNumber, paid: chargeMode === "paid" },
    });
  }

  if (status === "DONE") {
    if (reopening) {
      return (
        <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
          <p className="text-sm text-gray-700">
            Reabrir este atendimento? O lançamento feito ao concluir sai do Financeiro.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => updateStatus("SCHEDULED")}
              disabled={loading}
              className={BTN_PRIMARY}
            >
              {loading ? "Reabrindo..." : "Reabrir"}
            </button>
            <button type="button" onClick={() => setReopening(false)} className={BTN_SECONDARY}>
              Voltar
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        {notice && <p className="mr-auto text-xs text-gray-500">{notice}</p>}
        <button type="button" onClick={() => setReopening(true)} className={BTN_SECONDARY}>
          Reabrir
        </button>
      </div>
    );
  }

  if (cancelling) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <input
          autoFocus
          type="text"
          placeholder="Motivo (opcional)"
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          className="min-h-11 md:min-h-9 w-full sm:w-56 rounded-full border border-gray-300 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
          onKeyDown={(e) => {
            if (e.key === "Enter") updateStatus("CANCELLED", { cancelReason });
            if (e.key === "Escape") setCancelling(false);
          }}
        />
        <button
          type="button"
          onClick={() => updateStatus("CANCELLED", { cancelReason })}
          disabled={loading}
          className={`${BTN_BASE} bg-red-600 text-white hover:bg-red-700`}
        >
          {loading ? "Cancelando..." : "Confirmar cancelamento"}
        </button>
        <button type="button" onClick={() => setCancelling(false)} className={BTN_SECONDARY}>
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!started && status === "SCHEDULED" && (
        <button
          type="button"
          onClick={() => updateStatus("CONFIRMED")}
          disabled={loading}
          className={BTN_PRIMARY}
        >
          Confirmar
        </button>
      )}

      {started && (
        <>
          <button
            type="button"
            onClick={() => {
              setAmount(defaultAmount ? String(defaultAmount) : "");
              setChargeMode("paid");
              setCompleting(true);
            }}
            disabled={loading}
            className={BTN_PRIMARY}
          >
            Concluiu
          </button>
          <button
            type="button"
            onClick={() =>
              updateStatus("CANCELLED", { cancelReason: "Não compareceu", noShow: "true" })
            }
            disabled={loading}
            title="Marcar como não compareceu e enviar mensagem"
            className={BTN_SECONDARY}
          >
            Faltou
          </button>
        </>
      )}

      {completing && (
        <Modal onClose={() => setCompleting(false)} className="p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <h3 className="font-display text-xl text-gray-900">Concluir atendimento</h3>
            <button
              type="button"
              onClick={() => setCompleting(false)}
              aria-label="Fechar"
              className="-mr-2 -mt-2 flex h-11 w-11 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X size={18} />
            </button>
          </div>

          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium text-gray-700">Pagamento</legend>
            {CHARGE_OPTIONS.map((o) => (
              <label
                key={o.value}
                className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                  chargeMode === o.value ? "border-violet-300 bg-violet-50" : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name={`cobranca-${appointmentId}`}
                  checked={chargeMode === o.value}
                  onChange={() => setChargeMode(o.value)}
                  className="accent-violet-600"
                />
                <span>
                  <span className="block text-sm text-gray-900">{o.label}</span>
                  <span className="block text-xs text-gray-500">{o.hint}</span>
                </span>
              </label>
            ))}
          </fieldset>

          {chargeMode !== "none" && (
            <div className="mt-4">
              <label htmlFor={`valor-${appointmentId}`} className="mb-1.5 block text-sm font-medium text-gray-700">
                Valor cobrado (R$)
              </label>
              <Input
                id={`valor-${appointmentId}`}
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
              />
            </div>
          )}

          <Button
            onClick={confirmCompletion}
            disabled={loading || !amountValid}
            className="mt-6 w-full"
          >
            {loading ? "Concluindo..." : "Concluir"}
          </Button>
        </Modal>
      )}

      <div className="relative ml-auto">
        <button
          type="button"
          aria-label="Mais ações"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          disabled={loading}
          className="inline-flex size-11 md:size-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          <MoreHorizontal size={18} strokeWidth={1.75} aria-hidden="true" />
        </button>

        {menuOpen && (
          <>
            <button
              type="button"
              aria-label="Fechar menu"
              tabIndex={-1}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-10 cursor-default"
            />
            <div
              role="menu"
              className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-gray-200 bg-white p-1 shadow-md"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  setCancelling(true);
                }}
                className="flex min-h-11 md:min-h-9 w-full items-center rounded-lg px-3 text-left text-sm text-red-600 hover:bg-red-50"
              >
                Cancelar atendimento
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
