"use client";

import { useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Modal } from "@/components/modal";
import { StatusBadge } from "@/components/status-badge";
import { AppointmentActions } from "@/components/appointment-actions";
import { APPOINTMENT_STATUS } from "@/lib/status-labels";

type Status = "SCHEDULED" | "CONFIRMED" | "DONE" | "CANCELLED";

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
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex min-h-11 w-full flex-col justify-center rounded-lg border border-gray-200 bg-white px-2 py-1 text-left hover:bg-gray-50 ${
          status === "DONE" ? "opacity-70" : ""
        }`}
      >
        <span className="flex items-center gap-1 text-[11px] tabular-nums text-gray-500">
          <span aria-hidden className={`size-1.5 shrink-0 rounded-full ${STATUS_DOT[status] ?? "bg-gray-400"}`} />
          {horaBR(startTime)}
          <span className="sr-only"> · {APPOINTMENT_STATUS[status]?.label}</span>
        </span>
        <span className="truncate text-xs font-medium text-gray-900">{clientName}</span>
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
              <StatusBadge status={status} map={APPOINTMENT_STATUS} />
            </div>

            <AppointmentActions
              appointmentId={appointmentId}
              status={status}
              startTime={startTime}
              serverNow={serverNow}
              defaultAmount={defaultAmount}
              clientId={clientId}
              clientName={clientName}
              serviceType={serviceType}
              notes={notes}
              menuUp
            />
          </div>
        </Modal>
      )}
    </>
  );
}
