"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, X } from "lucide-react";
import { Modal } from "@/components/modal";
import { Input } from "@/components/input";
import { Button } from "@/components/button";
import { EditAppointmentModal } from "@/components/edit-appointment-modal";
import { apiRequest } from "@/lib/api-client";

type Status = "SCHEDULED" | "CONFIRMED" | "DONE" | "CANCELLED";
type ChargeMode = "plan" | "paid" | "pending" | "none";

const CHARGE_OPTIONS: { value: Exclude<ChargeMode, "plan">; label: string; hint: string }[] = [
  { value: "paid", label: "Já recebi", hint: "Entra como recebido no Financeiro" },
  { value: "pending", label: "A receber", hint: "Fica pendente para enviar o Pix depois" },
  { value: "none", label: "Não cobrar", hint: "Cortesia ou combinado à parte" },
];

const BTN_BASE =
  "inline-flex min-h-11 md:min-h-9 items-center justify-center rounded-full px-4 text-sm font-medium transition-colors disabled:opacity-50";
const BTN_PRIMARY = `${BTN_BASE} bg-violet-600 text-white hover:bg-violet-700`;
const BTN_SECONDARY = `${BTN_BASE} border border-gray-300 bg-white text-gray-700 hover:bg-gray-50`;

export function AppointmentActions({
  appointmentId,
  status,
  startTime,
  endTime,
  serverNow,
  defaultAmount,
  clientId,
  clientName,
  serviceType,
  notes,
  menuUp = false,
  planRemaining = 0,
  isPartner = false,
}: {
  appointmentId: string;
  status: Status;
  startTime: string;
  endTime: string;
  /** Valor sugerido ao concluir: cobrança em aberto do atendimento ou preço do serviço. */
  defaultAmount?: number | null;
  clientId: string | null;
  clientName: string;
  serviceType: string;
  notes: string | null;
  /** Horário do render no servidor: o primeiro render do navegador usa o mesmo valor, sem erro de hidratação. */
  serverNow: number;
  /** Abre o menu "Mais" para cima: dentro da folha da Semana o espaço abaixo é cortado. */
  menuUp?: boolean;
  /** Sessões que sobram nos pacotes ativos do cliente: com saldo, concluir já vem "pelo pacote". */
  planRemaining?: number;
  /** Atendimento em parceria (o valor sugerido já vem pela metade). */
  isPartner?: boolean;
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
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

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

  const errorNode = error ? (
    <p role="alert" className="text-sm text-red-600">
      {error}
    </p>
  ) : null;

  // Abrir ou fechar uma folha apaga o erro da tentativa anterior.
  function showSheet(set: (v: boolean) => void, open: boolean) {
    setError("");
    set(open);
  }

  async function updateStatus(newStatus: Status, extra?: Record<string, unknown>) {
    setLoading(true);
    setError("");
    try {
      const r = await apiRequest<{ keptPayments?: number }>(`/api/appointments/${appointmentId}`, {
        method: "PATCH",
        body: { status: newStatus, ...extra },
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      if ((r.data?.keptPayments ?? 0) > 0) {
        setNotice("O Pix pago pelo Mercado Pago foi mantido no Financeiro.");
      }
      setCancelling(false);
      setCompleting(false);
      setReopening(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const amountNumber = Number(amount.replace(",", "."));
  const noCharge = chargeMode === "none" || chargeMode === "plan";
  const amountValid = noCharge || (Number.isFinite(amountNumber) && amountNumber > 0);

  function confirmCompletion() {
    if (!amountValid) return;
    updateStatus("DONE", {
      charge: noCharge ? null : { amount: amountNumber, paid: chargeMode === "paid" },
      usePlan: chargeMode === "plan",
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
            <button type="button" onClick={() => showSheet(setReopening, false)} className={BTN_SECONDARY}>
              Voltar
            </button>
          </div>
          {errorNode}
        </div>
      );
    }
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        {notice && <p className="mr-auto text-xs text-gray-500">{notice}</p>}
        {errorNode}
        <button type="button" onClick={() => showSheet(setReopening, true)} className={BTN_SECONDARY}>
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
            if (e.key === "Escape") showSheet(setCancelling, false);
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
        <button type="button" onClick={() => showSheet(setCancelling, false)} className={BTN_SECONDARY}>
          Voltar
        </button>
        {errorNode && <div className="w-full">{errorNode}</div>}
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
              setChargeMode(planRemaining > 0 ? "plan" : "paid");
              showSheet(setCompleting, true);
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
        <Modal onClose={() => showSheet(setCompleting, false)} className="p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <h3 className="font-display text-xl text-gray-900">Concluir atendimento</h3>
            <button
              type="button"
              onClick={() => showSheet(setCompleting, false)}
              aria-label="Fechar"
              className="-mr-2 -mt-2 flex h-11 w-11 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X size={18} />
            </button>
          </div>

          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium text-gray-700">Pagamento</legend>
            {[
              ...(planRemaining > 0
                ? [
                    {
                      value: "plan" as const,
                      label: "Pelo pacote",
                      hint: `Já pago. Sobram ${planRemaining} ${planRemaining === 1 ? "sessão" : "sessões"}; esta usa uma`,
                    },
                  ]
                : []),
              ...CHARGE_OPTIONS,
            ].map((o) => (
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

          {isPartner && !noCharge && (
            <p className="mt-3 text-xs text-gray-500">Parceria: o valor sugerido é a sua metade.</p>
          )}

          {!noCharge && (
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

          {errorNode && <div className="mt-4">{errorNode}</div>}

          <Button
            onClick={confirmCompletion}
            disabled={loading || !amountValid}
            className="mt-6 w-full"
          >
            {loading ? "Concluindo..." : "Concluir"}
          </Button>
        </Modal>
      )}

      {editing && (
        <EditAppointmentModal
          appointmentId={appointmentId}
          clientId={clientId}
          clientName={clientName}
          serviceType={serviceType}
          startTime={startTime}
          endTime={endTime}
          notes={notes}
          isPartner={isPartner}
          onClose={() => setEditing(false)}
        />
      )}

      {!completing && errorNode && <div className="w-full">{errorNode}</div>}

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
              className={`absolute right-0 z-20 w-56 rounded-xl border border-gray-200 bg-white p-1 shadow-md ${
                menuUp ? "bottom-full mb-2" : "mt-2"
              }`}
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  setEditing(true);
                }}
                className="flex min-h-11 md:min-h-9 w-full items-center rounded-lg px-3 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                Editar atendimento
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  showSheet(setCancelling, true);
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
