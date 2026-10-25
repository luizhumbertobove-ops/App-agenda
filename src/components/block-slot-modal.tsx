"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BanIcon, X, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Modal } from "@/components/modal";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { dateKeyBR } from "@/lib/date";
import { apiRequest } from "@/lib/api-client";

type BlockedSlot = { id: string; startTime: string; endTime: string; reason?: string | null };

export function BlockSlotModal({
  currentDate,
  blockedSlots,
}: {
  currentDate: string;
  blockedSlots: BlockedSlot[];
}) {
  const [open, setOpen] = useState(false);
  // Começa no dia aberto na agenda, mas dá para escolher outro (útil na visão Semana).
  const [date, setDate] = useState(currentDate);
  const [startTime, setStartTime] = useState("12:00");
  const [endTime, setEndTime] = useState("13:00");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const daySlots = blockedSlots.filter(
    (s) => dateKeyBR(new Date(s.startTime)) === date
  );

  async function handleBlock() {
    setLoading(true);
    setError("");
    try {
      const start = new Date(`${date}T${startTime}:00-03:00`);
      const end = new Date(`${date}T${endTime}:00-03:00`);
      if (end <= start) {
        setError("Horário de fim deve ser após o início.");
        return;
      }
      const r = await apiRequest("/api/blocked-slots", {
        method: "POST",
        body: {
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          reason: reason.trim() || undefined,
        },
      }, "Erro ao bloquear horário.");
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.refresh();
      setOpen(false);
      setReason("");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setError("");
    const r = await apiRequest(`/api/blocked-slots/${id}`, { method: "DELETE" }, "Não consegui excluir. Tente de novo.");
    if (!r.ok) {
      setError(r.error);
      return;
    }
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => {
          setDate(currentDate);
          setOpen(true);
        }}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition-colors"
      >
        <BanIcon size={13} />
        Bloquear horário
      </button>

      {open && (
        <Modal onClose={() => setOpen(false)} maxWidth="sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Bloquear horário</h3>
            <button onClick={() => setOpen(false)} aria-label="Fechar" className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>

          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Dia</label>
              <Input type="date" ring="danger" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Início</label>
                <Input type="time" ring="danger" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Fim</label>
                <Input type="time" ring="danger" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Motivo (opcional)</label>
              <Input
                ring="danger"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex: Almoço, Feriado..."
              />
            </div>

            {daySlots.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Já bloqueado neste dia:</p>
                <div className="space-y-1">
                  {daySlots.map((s) => (
                    <div key={s.id} className="flex items-center justify-between text-xs bg-red-50 rounded-lg px-3 py-1.5">
                      <span className="text-red-700">
                        {format(new Date(s.startTime), "HH:mm")} – {format(new Date(s.endTime), "HH:mm")}
                        {s.reason && ` · ${s.reason}`}
                      </span>
                      <button
                        onClick={() => handleDelete(s.id)}
                        aria-label="Remover bloqueio"
                        className="text-red-400 hover:text-red-700 ml-2"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && <p className="text-xs text-red-600">{error}</p>}

            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setOpen(false)} className="flex-1 py-2">
                Cancelar
              </Button>
              <Button variant="danger" onClick={handleBlock} disabled={loading} className="flex-1 py-2">
                {loading ? "Bloqueando..." : "Bloquear"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
