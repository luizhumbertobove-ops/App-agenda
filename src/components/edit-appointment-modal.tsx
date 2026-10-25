"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, X } from "lucide-react";
import { useSlots } from "@/hooks/use-slots";
import { Modal } from "@/components/modal";
import { Button } from "@/components/button";
import { Input, Textarea } from "@/components/input";
import { ClientCombobox } from "@/components/client-combobox";
import { PartnerToggle } from "@/components/partner-toggle";
import { MAX_SESSION_HOURS, SessionHoursPicker, sessionMinutes } from "@/components/session-hours-picker";
import { dateKeyBR, formatTimeBR } from "@/lib/date";
import { apiRequest } from "@/lib/api-client";
import type { ClientOption, ServiceOption, SlotOption } from "@/lib/types";


/** Folha para mudar serviço, data, horário e observações de um atendimento já marcado. */
export function EditAppointmentModal({
  appointmentId,
  clientId: initialClientId,
  clientName,
  serviceType,
  startTime,
  endTime,
  notes: initialNotes,
  isPartner: initialPartner = false,
  onClose,
}: {
  appointmentId: string;
  /** Cadastro ligado ao atendimento; null em evento importado do Google sem cliente. */
  clientId: string | null;
  clientName: string;
  serviceType: string;
  startTime: string;
  endTime: string;
  notes: string | null;
  isPartner?: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [clients, setClients] = useState<ClientOption[] | null>(null);
  const [clientId, setClientId] = useState(initialClientId ?? "");
  const [isPartner, setIsPartner] = useState(initialPartner);
  const [partnerName, setPartnerName] = useState(clientName);
  const [serviceName, setServiceName] = useState(serviceType);
  const [date, setDate] = useState(dateKeyBR(new Date(startTime)));
  const [selected, setSelected] = useState<SlotOption | null>(null);
  const [notes, setNotes] = useState(initialNotes ?? "");
  // Tempo atual: até 1 h conta como sessão normal; acima disso, horas inteiras (2 h, 3 h).
  const [hours, setHours] = useState(() =>
    Math.min(MAX_SESSION_HOURS, Math.max(1, Math.ceil((new Date(endTime).getTime() - new Date(startTime).getTime()) / 3_600_000)))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Todos os serviços (inclusive os fora da vitrine), para o atual sempre aparecer na lista.
  useEffect(() => {
    fetch("/api/clients?simple=1")
      .then((r) => r.json())
      .then(setClients)
      .catch(() => setClients([]));
  }, []);

  useEffect(() => {
    fetch("/api/servicos?all=1")
      .then((r) => r.json())
      .then(setServices)
      .catch(() => setServices([]));
  }, []);

  const service = services.find((s) => s.name === serviceName);
  const duration = sessionMinutes(hours, service?.durationMins ?? 60);
  const slotsUrl = date
    ? `/api/availability?date=${date}&duration=${duration}&exclude=${appointmentId}`
    : null;
  const { data: fetchedSlots, loading: loadingSlots } = useSlots<SlotOption[]>(slotsUrl);
  const slots = slotsUrl ? fetchedSlots ?? [] : [];

  // Sem escolha nova, fica o horário atual (se ainda existir na lista desse dia).
  const slot =
    selected ??
    slots.find(
      (s) => formatTimeBR(new Date(s.start)) === formatTimeBR(new Date(startTime)) && date === dateKeyBR(new Date(startTime))
    ) ?? null;

  async function handleSave() {
    if (!slot) return;
    setSaving(true);
    setError("");
    try {
      const r = await apiRequest(`/api/appointments/${appointmentId}`, {
        method: "PATCH",
        body: {
          ...(isPartner
            ? { isPartner: true, partnerName: partnerName.trim() }
            : {
                ...(initialPartner ? { isPartner: false } : {}),
                ...(clientId && clientId !== initialClientId ? { clientId } : {}),
              }),
          serviceType: serviceName,
          startTime: slot.start,
          endTime: slot.end,
          notes: notes.trim() || null,
        },
      }, "Não foi possível salvar.");
      if (!r.ok) {
        setError(r.error);
        return;
      }
      onClose();
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal onClose={onClose} maxWidth="lg">
      <div className="flex items-start justify-between gap-3 px-6 pt-5">
        <div className="min-w-0">
          <h3 className="font-display text-xl text-gray-900">Editar atendimento</h3>
          <p className="truncate text-sm text-gray-500">{clientName}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <X size={18} />
        </button>
      </div>

      <div className="space-y-5 p-6">
        <div>
          <PartnerToggle checked={isPartner} onChange={setIsPartner} />
          <p className="mb-1.5 text-sm font-medium text-gray-700">Cliente</p>
          {isPartner ? (
            <Input
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
              placeholder="Nome do cliente"
              aria-label="Nome do cliente da parceria"
            />
          ) : clients === null ? (
            <p className="text-sm text-gray-400">Carregando clientes...</p>
          ) : (
            <ClientCombobox
              clients={clients}
              value={clientId}
              onChange={(id) => setClientId(id)}
              allowCreate
              initialSearch={clientName}
            />
          )}
          {!initialClientId && !isPartner && (
            <p className="mt-1.5 text-xs text-gray-500">
              Este atendimento veio do Google Agenda sem cadastro. Escolha o cliente ou crie um novo com o
              WhatsApp.
            </p>
          )}
        </div>

        <div>
          <label htmlFor={`servico-${appointmentId}`} className="mb-1.5 block text-sm font-medium text-gray-700">
            Serviço
          </label>
          <select
            id={`servico-${appointmentId}`}
            value={serviceName}
            onChange={(e) => {
              setServiceName(e.target.value);
              setSelected(null);
            }}
            className="min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-[15px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-200"
          >
            {!service && <option value={serviceName}>{serviceName}</option>}
            {services.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name} — {s.durationMins} min
              </option>
            ))}
          </select>
        </div>

        <SessionHoursPicker
          value={hours}
          onChange={(h) => {
            setHours(h);
            setSelected(null);
          }}
        />

        <div>
          <label htmlFor={`data-${appointmentId}`} className="mb-1.5 block text-sm font-medium text-gray-700">
            Data
          </label>
          <Input
            id={`data-${appointmentId}`}
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setSelected(null);
            }}
            className="min-h-11"
          />
        </div>

        {date && (
          <div>
            <p className="mb-2 flex items-center gap-1 text-sm font-medium text-gray-700">
              <Clock size={13} aria-hidden />
              Horário
            </p>
            {loadingSlots ? (
              <p className="text-sm text-gray-400">Carregando horários...</p>
            ) : slots.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhum horário nesta data.</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {slots.map((s) => {
                  const on = slot?.start === s.start;
                  return (
                    <button
                      key={s.start}
                      type="button"
                      disabled={!s.available}
                      onClick={() => setSelected(s)}
                      aria-pressed={on}
                      className={`min-h-11 rounded-full border text-sm font-medium transition-colors ${
                        !s.available
                          ? "cursor-not-allowed border-gray-100 bg-gray-50 text-gray-300"
                          : on
                            ? "border-violet-600 bg-violet-600 text-white"
                            : "border-gray-200 text-gray-700 hover:border-violet-300 hover:bg-violet-50"
                      }`}
                    >
                      {formatTimeBR(new Date(s.start))}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div>
          <label htmlFor={`obs-${appointmentId}`} className="mb-1.5 block text-sm font-medium text-gray-700">
            Observações <span className="font-normal text-gray-400">(opcional)</span>
          </label>
          <Textarea id={`obs-${appointmentId}`} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !slot || (isPartner && !partnerName.trim())} className="flex-1">
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
