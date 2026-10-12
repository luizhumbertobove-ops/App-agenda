"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Clock, DollarSign, X } from "lucide-react";
import { useSlots } from "@/hooks/use-slots";
import { formatCurrencyBR } from "@/lib/format";
import { Modal } from "@/components/modal";
import { Button } from "@/components/button";
import { Input, Textarea } from "@/components/input";
import { ClientCombobox } from "@/components/client-combobox";

type Client = { id: string; name: string; phone: string };
type Service = { id: string; name: string; durationMins: number; price: number };
type Slot = { start: string; end: string; available: boolean };

export function NewAppointmentModal({ clients }: { clients: Client[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Campos do formulário
  const [clientId, setClientId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [notes, setNotes] = useState("");

  // Cobrança opcional
  const [createPayment, setCreatePayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");

  // Recorrência semanal
  const [repeatWeeks, setRepeatWeeks] = useState(0);

  // Estado assíncrono
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedService = services.find((s) => s.id === serviceId);

  // Carregar serviços ao abrir
  useEffect(() => {
    if (!open || services.length > 0) return;
    fetch("/api/servicos")
      .then((r) => r.json())
      .then((data) => {
        setServices(data);
        if (data.length > 0) {
          setServiceId(data[0].id);
          setPaymentAmount(String(data[0].price));
        }
      });
  }, [open, services.length]);

  function handleServiceChange(id: string) {
    setServiceId(id);
    setSelectedSlot(null);
    const service = services.find((s) => s.id === id);
    if (service) setPaymentAmount(String(service.price));
  }

  // Carregar slots ao mudar data ou serviço
  const slotsUrl =
    date && selectedService ? `/api/availability?date=${date}&duration=${selectedService.durationMins}` : null;
  const { data: fetchedSlots, loading: loadingSlots } = useSlots<Slot[]>(slotsUrl);
  const slots = slotsUrl ? fetchedSlots ?? [] : [];

  function handleClose() {
    setOpen(false);
  }

  async function handleSubmit() {
    if (!clientId || !selectedSlot || !selectedService) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          serviceType: selectedService.name,
          startTime: selectedSlot.start,
          endTime: selectedSlot.end,
          notes: notes || undefined,
          amount: createPayment && paymentAmount ? Number(paymentAmount) : undefined,
          repeatWeeks: repeatWeeks > 0 ? repeatWeeks : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(typeof data.error === "string" ? data.error : "Erro ao criar agendamento");
        return;
      }

      handleClose();
      router.refresh();
    } catch {
      setError("Erro ao criar agendamento");
    } finally {
      setLoading(false);
    }
  }

  const today = new Date().toISOString().split("T")[0];

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="flex items-center gap-2">
        <Plus size={16} />
        <span className="hidden sm:inline">Novo Agendamento</span>
      </Button>
    );
  }

  return (
    <Modal onClose={handleClose} maxWidth="lg" className="max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between p-6 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">Novo Agendamento</h3>
        <button
          onClick={handleClose}
          aria-label="Fechar"
          className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
        >
          <X size={18} />
        </button>
      </div>

      <div className="p-6 space-y-5">
        {/* Cliente */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">Cliente</label>
          <ClientCombobox clients={clients} value={clientId} onChange={(id) => setClientId(id)} allowCreate />
        </div>

        {/* Serviço */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">Serviço</label>
          <select
            value={serviceId}
            onChange={(e) => handleServiceChange(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
          >
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.durationMins}min — {formatCurrencyBR(s.price)}
              </option>
            ))}
          </select>
        </div>

        {/* Data */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">Data</label>
          <Input
            type="date"
            value={date}
            min={today}
            onChange={(e) => {
              setDate(e.target.value);
              setSelectedSlot(null);
            }}
          />
        </div>

        {/* Horários disponíveis */}
        {date && (
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              <Clock size={13} className="inline mr-1" />
              Horário disponível
            </label>
            {loadingSlots ? (
              <p className="text-sm text-gray-400">Carregando horários...</p>
            ) : slots.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhum horário disponível nesta data.</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {slots.map((slot) => {
                  const time = new Date(slot.start).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "America/Sao_Paulo",
                  });
                  const isSelected = selectedSlot?.start === slot.start;
                  return (
                    <button
                      key={slot.start}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => setSelectedSlot(slot)}
                      className={`text-xs py-2 rounded-lg font-medium border transition-colors ${
                        !slot.available
                          ? "border-gray-100 text-gray-300 bg-gray-50 cursor-not-allowed"
                          : isSelected
                          ? "border-violet-600 bg-violet-600 text-white"
                          : "border-gray-200 text-gray-700 hover:border-violet-300 hover:bg-violet-50"
                      }`}
                    >
                      {time}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Observações */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">
            Observações <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Preferências, histórico, etc."
          />
        </div>

        {/* Cobrança */}
        <div className="border border-gray-100 rounded-lg p-3 bg-gray-50">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={createPayment}
              onChange={(e) => setCreatePayment(e.target.checked)}
              className="accent-violet-600"
            />
            <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
              <DollarSign size={14} className="text-amber-500" />
              Gerar cobrança para este agendamento
            </span>
          </label>
          {createPayment && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-500">R$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-28 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white"
              />
              <span className="text-xs text-gray-400">Valor da sessão</span>
            </div>
          )}
        </div>

        {/* Repetição semanal */}
        <div className="border border-gray-100 rounded-lg p-3 bg-gray-50">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={repeatWeeks > 0}
              onChange={(e) => setRepeatWeeks(e.target.checked ? 4 : 0)}
              className="accent-violet-600"
            />
            <span className="text-sm font-medium text-gray-700">Repetir semanalmente</span>
          </label>
          {repeatWeeks > 0 && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-500">Por</span>
              <select
                value={repeatWeeks}
                onChange={(e) => setRepeatWeeks(Number(e.target.value))}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white"
              >
                {[2, 3, 4, 6, 8, 12].map((w) => (
                  <option key={w} value={w}>
                    {w} semanas
                  </option>
                ))}
              </select>
              <span className="text-xs text-gray-400">({repeatWeeks} agendamentos no total)</span>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        <div className="flex gap-3 pt-1">
          <Button variant="secondary" onClick={handleClose} className="flex-1 py-2.5">
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!clientId || !selectedSlot || loading}
            className="flex-1 py-2.5 disabled:cursor-not-allowed"
          >
            {loading ? "Salvando..." : "Confirmar Agendamento"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
