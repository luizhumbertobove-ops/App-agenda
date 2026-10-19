"use client";

import { useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Modal } from "@/components/modal";
import { StatusBadge } from "@/components/status-badge";
import { AppointmentActions } from "@/components/appointment-actions";
import { APPOINTMENT_STATUS } from "@/lib/status-labels";

type Status = "SCHEDULED" | "CONFIRMED" | "DONE" | "CANCELLED";

/** Fundo do cartão no celular pelo status (no PC o status é o ponto de cor). */
const STATUS_BG_MOBILE: Record<string, string> = {
  SCHEDULED: "bg-blue-50",
  CONFIRMED: "bg-green-50",
  DONE: "bg-amber-50",
};

/** Ponto de cor pelo status (o design system não usa borda de um lado só). */
const STATUS_DOT: Record<string, string> = {
  SCHEDULED: "bg-blue-400",
  CONFIRMED: "bg-green-500",
  DONE: "bg-amber-400",
};

function horaBR(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

function diaBR(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Sao_Paulo",
  });
}

/**
 * Cartão compacto da grade semanal. Tocar abre uma folha com os dados do atendimento
 * e as mesmas ações da visão Dia (confirmar, concluir, faltou, editar, cancelar, reabrir).
 */
export function WeekAppointmentCard({
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
  planRemaining = 0,
  isPartner = false,
}: {
  appointmentId: string;
  status: Status;
  startTime: string;
  endTime: string;
  serverNow: number;
  defaultAmount: number | null;
  clientId: string | null;
  clientName: string;
  serviceType: string;
  notes: string | null;
  planRemaining?: number;
  isPartner?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const onTheHour = horaBR(startTime).endsWith(":00");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex min-h-11 w-full min-w-0 flex-col justify-center rounded-md border border-gray-200 px-[3px] py-1 text-left hover:bg-gray-50 md:rounded-lg md:bg-white md:px-2 ${
          STATUS_BG_MOBILE[status] ?? "bg-white"
        } ${
          status === "DONE" ? "opacity-70" : ""
        }`}
      >
        {/* No celular a hora só aparece se não for cheia (a linha da grade já diz a hora). */}
        <span
          className={`items-center gap-1 text-[9px] tabular-nums text-gray-500 md:flex md:text-[11px] ${
            onTheHour ? "hidden" : "flex"
          }`}
        >
          <span aria-hidden className={`size-1.5 shrink-0 rounded-full ${STATUS_DOT[status] ?? "bg-gray-400"}`} />
          {horaBR(startTime)}
        </span>
        <span className="flex min-w-0 items-start gap-1">
          <span className="line-clamp-2 break-words hyphens-auto text-[10px] font-medium leading-tight text-gray-900 md:line-clamp-1 md:text-xs">
            {clientName}
          </span>
        </span>
        <span className="sr-only">
          {horaBR(startTime)} · {APPOINTMENT_STATUS[status]?.label}
        </span>
        {isPartner && <span className="truncate text-[9px] font-medium text-amber-700 md:text-[10px]">Parceria</span>}
      </button>

      {open && (
        <Modal onClose={() => setOpen(false)}>
          <div className="space-y-4 px-6 pt-4 pb-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs capitalize text-gray-500">{diaBR(startTime)}</p>
                <h3 className="font-display text-2xl text-gray-900">
                  {horaBR(startTime)}–{horaBR(endTime)}
                </h3>
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

            <div className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4">
              <div className="min-w-0">
                {clientId ? (
                  <Link
                    href={`/clientes/${clientId}`}
                    className="block truncate text-[15px] font-medium text-gray-900 hover:underline"
                  >
                    {clientName}
                  </Link>
                ) : (
                  <p className="truncate text-[15px] font-medium text-gray-900">{clientName}</p>
                )}
                <p className="text-sm text-gray-500">{serviceType}</p>
                {notes && <p className="mt-2 whitespace-pre-line text-sm text-gray-600">{notes}</p>}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <StatusBadge status={status} map={APPOINTMENT_STATUS} />
                {isPartner && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                    Parceria
                  </span>
                )}
              </div>
            </div>

            <AppointmentActions
              appointmentId={appointmentId}
              status={status}
              startTime={startTime}
              endTime={endTime}
              serverNow={serverNow}
              defaultAmount={defaultAmount}
              clientId={clientId}
              clientName={clientName}
              serviceType={serviceType}
              notes={notes}
              planRemaining={planRemaining}
              isPartner={isPartner}
              menuUp
            />
          </div>
        </Modal>
      )}
    </>
  );
}
