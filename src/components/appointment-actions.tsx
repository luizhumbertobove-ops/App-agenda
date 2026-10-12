"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";

type Status = "SCHEDULED" | "CONFIRMED" | "DONE" | "CANCELLED";

const BTN_BASE =
  "inline-flex min-h-11 md:min-h-9 items-center justify-center rounded-full px-4 text-sm font-medium transition-colors disabled:opacity-50";
const BTN_PRIMARY = `${BTN_BASE} bg-violet-600 text-white hover:bg-violet-700`;
const BTN_SECONDARY = `${BTN_BASE} border border-gray-300 bg-white text-gray-700 hover:bg-gray-50`;

export function AppointmentActions({
  appointmentId,
  status,
  startTime,
  serverNow,
}: {
  appointmentId: string;
  status: Status;
  startTime: string;
  /** Horário do render no servidor: o primeiro render do navegador usa o mesmo valor, sem erro de hidratação. */
  serverNow: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [now, setNow] = useState(serverNow);

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

  if (status === "DONE" || status === "CANCELLED") return null;

  const started = now >= new Date(startTime).getTime();

  async function updateStatus(newStatus: Status, extra?: Record<string, string>) {
    setLoading(true);
    try {
      await fetch(`/api/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, ...extra }),
      });
      router.refresh();
    } finally {
      setLoading(false);
      setCancelling(false);
    }
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
            onClick={() => updateStatus("DONE")}
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
