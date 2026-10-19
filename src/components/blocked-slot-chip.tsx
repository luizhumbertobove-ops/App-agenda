"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, X } from "lucide-react";
import { Modal } from "@/components/modal";
import { Button } from "@/components/button";
import { Input } from "@/components/input";

const TZ = "America/Sao_Paulo";
const dataBR = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: TZ });
const horaBR = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: TZ });

/**
 * Bloqueio na agenda: mostra o motivo e, ao tocar, abre a edição (dia, início, fim, motivo)
 * com a opção de excluir. `variant="week"` é a versão compacta da grade semanal.
 */
export function BlockedSlotChip({
  id,
  startTime,
  endTime,
  reason,
  variant,
}: {
  id: string;
  startTime: string;
  endTime: string;
  reason: string | null;
  variant: "day" | "week";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(dataBR(startTime));
  const [start, setStart] = useState(horaBR(startTime));
  const [end, setEnd] = useState(horaBR(endTime));
  const [motivo, setMotivo] = useState(reason ?? "");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

  function abrir() {
    setDate(dataBR(startTime));
    setStart(horaBR(startTime));
    setEnd(horaBR(endTime));
    setMotivo(reason ?? "");
    setConfirmDelete(false);
    setError("");
    setOpen(true);
  }

  async function salvar() {
    const ini = new Date(`${date}T${start}:00-03:00`);
    const fim = new Date(`${date}T${end}:00-03:00`);
    if (!(fim > ini)) {
      setError("O fim precisa ser depois do início.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/blocked-slots/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startTime: ini.toISOString(), endTime: fim.toISOString(), reason: motivo.trim() || null }),
      });
      if (!res.ok) {
        setError("Não foi possível salvar o bloqueio.");
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

  async function excluir() {
    setSaving(true);
    try {
      await fetch(`/api/blocked-slots/${id}`, { method: "DELETE" });
      setOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const label = reason?.trim() || "Bloqueado";

  return (
    <>
      {variant === "week" ? (
        <button
          type="button"
          onClick={abrir}
          title={`${label} · ${horaBR(startTime)}–${horaBR(endTime)}`}
          className="flex min-h-11 w-full min-w-0 flex-1 items-start gap-1 rounded-md bg-gray-100 px-[3px] py-1 text-left text-gray-600 hover:bg-gray-200 md:rounded-lg md:px-2"
        >
          <Lock size={11} strokeWidth={1.75} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span className="line-clamp-2 break-words hyphens-auto text-[10px] leading-tight md:text-xs">{label}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={abrir}
          className="flex min-h-12 w-full items-center gap-2 rounded-xl bg-gray-100 px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-200"
        >
          <Lock size={16} strokeWidth={1.75} className="shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            Bloqueado {horaBR(startTime)}–{horaBR(endTime)}
            {reason ? ` · ${reason}` : ""}
          </span>
          <span className="shrink-0 text-xs text-gray-400">Editar</span>
        </button>
      )}

      {open && (
        <Modal onClose={() => setOpen(false)} maxWidth="sm">
          <div className="space-y-4 px-6 pt-4 pb-6">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-xl text-gray-900">Editar bloqueio</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <div>
              <label htmlFor={`bl-dia-${id}`} className="mb-1.5 block text-sm font-medium text-gray-700">
                Dia
              </label>
              <Input id={`bl-dia-${id}`} type="date" ring="danger" value={date} onChange={(e) => setDate(e.target.value)} className="min-h-11" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor={`bl-ini-${id}`} className="mb-1.5 block text-sm font-medium text-gray-700">
                  Início
                </label>
                <Input id={`bl-ini-${id}`} type="time" ring="danger" value={start} onChange={(e) => setStart(e.target.value)} className="min-h-11" />
              </div>
              <div>
                <label htmlFor={`bl-fim-${id}`} className="mb-1.5 block text-sm font-medium text-gray-700">
                  Fim
                </label>
                <Input id={`bl-fim-${id}`} type="time" ring="danger" value={end} onChange={(e) => setEnd(e.target.value)} className="min-h-11" />
              </div>
            </div>
            <div>
              <label htmlFor={`bl-motivo-${id}`} className="mb-1.5 block text-sm font-medium text-gray-700">
                Motivo <span className="font-normal text-gray-400">(aparece na agenda)</span>
              </label>
              <Input
                id={`bl-motivo-${id}`}
                ring="danger"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ex: Academia, Almoço..."
                className="min-h-11"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            {confirmDelete ? (
              <div className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-700">Excluir este bloqueio? O horário volta a ficar livre.</p>
                <div className="flex gap-2">
                  <Button variant="danger" onClick={excluir} disabled={saving} className="flex-1">
                    Excluir
                  </Button>
                  <Button variant="secondary" onClick={() => setConfirmDelete(false)} className="flex-1">
                    Voltar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Button onClick={salvar} disabled={saving} className="w-full">
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex min-h-11 w-full items-center justify-center text-sm font-medium text-red-600 hover:underline"
                >
                  Excluir bloqueio
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
