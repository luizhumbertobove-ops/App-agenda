"use client";

import { useState, useMemo } from "react";
import { CalendarDays, Clock, MessageCircle, BadgeCheck, Phone } from "lucide-react";
import { whatsappLink, isBusinessDay } from "@/lib/vitrine";
import { useSlots } from "@/hooks/use-slots";
import { formatCurrencyBR } from "@/lib/format";
import { Card } from "@/components/vitrine/ds/Card";
import { ServiceCard } from "@/components/vitrine/ds/ServiceCard";
import { Input } from "@/components/vitrine/ds/Input";
import { Textarea } from "@/components/vitrine/ds/Textarea";
import { TimeSlot } from "@/components/vitrine/ds/TimeSlot";
import { Button } from "@/components/vitrine/ds/Button";
import { Icon } from "@/components/vitrine/ds/Icon";

type Service = { id: string; name: string; durationMins: number; price: number };
type Slot = { start: string; end: string };

function todayBR(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
}

export function AgendarForm({
  services,
  initialServiceId,
}: {
  services: Service[];
  initialServiceId?: string;
}) {
  const [serviceId, setServiceId] = useState(
    initialServiceId && services.some((s) => s.id === initialServiceId)
      ? initialServiceId
      : services[0]?.id ?? ""
  );
  const [date, setDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState<{
    dateLabel: string;
    serviceName: string;
    isFirstSession: boolean;
  } | null>(null);

  const service = services.find((s) => s.id === serviceId);
  const today = useMemo(() => todayBR(), []);
  const isWeekend = date.length > 0 && !isBusinessDay(date);

  const slotsUrl = date && service && !isWeekend ? `/api/vitrine/availability?date=${date}` : null;
  const { data: fetchedSlots, loading: loadingSlots, refetch: refetchSlots } = useSlots<Slot[]>(slotsUrl);
  const slots = slotsUrl ? fetchedSlots ?? [] : [];

  function handleDateChange(value: string) {
    setDate(value);
    setSelectedSlot(null);
    setError("");
  }

  function handleServiceChange(id: string) {
    setServiceId(id);
    setSelectedSlot(null);
    setError("");
  }

  function fallbackMessage() {
    const dateLabel = date
      ? new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
      : "";
    const servicePart = service ? ` (${service.name})` : "";
    return `Olá Humberto, vim pelo site e queria marcar um horário no dia ${dateLabel}${servicePart}, mas não achei horário disponível online. Pode me ajudar?`;
  }

  async function handleSubmit() {
    if (!service || !selectedSlot || !name.trim() || !phone.trim()) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/vitrine/agendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          serviceId: service.id,
          startTime: selectedSlot.start,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Não foi possível reservar esse horário.");
        if (res.status === 409 && date) {
          refetchSlots();
          setSelectedSlot(null);
        }
        return;
      }

      setConfirmed({
        dateLabel: new Date(data.startTime).toLocaleString("pt-BR", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "America/Sao_Paulo",
        }),
        serviceName: data.serviceName,
        isFirstSession: Boolean(data.isFirstSession),
      });
    } catch {
      setError("Não foi possível enviar sua reserva. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmed) {
    return (
      <div className="flex flex-col items-center text-center gap-4">
        <Icon icon={BadgeCheck} size={40} style={{ color: "var(--status-success)" }} />
        <div className="flex flex-col gap-2">
          <h1>Sessão confirmada</h1>
          <p style={{ font: "var(--type-body)", color: "var(--text-body)" }}>
            {confirmed.serviceName} · {confirmed.dateLabel}
          </p>
          <p style={{ font: "var(--type-caption)", color: "var(--text-muted)" }}>
            A confirmação chega no WhatsApp. Qualquer coisa, é só chamar.
          </p>
        </div>

        {confirmed.isFirstSession && (
          <Card tone="soft" className="text-left w-full">
            <p style={{ font: "var(--type-body)", fontSize: "var(--size-body-s)", fontWeight: "var(--weight-medium)", color: "var(--text-strong)", marginBottom: "var(--space-8)" }}>
              Primeira sessão — alguns avisos
            </p>
            <ul style={{ font: "var(--type-caption)", color: "var(--text-body)", paddingLeft: 18, display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
              <li>Venha com roupas leves e confortáveis.</li>
              <li>Evite refeições pesadas pouco antes da sessão.</li>
              <li>Chegue com alguns minutos de antecedência.</li>
              <li>Beba bastante água depois da sessão.</li>
            </ul>
            <p style={{ font: "var(--type-caption)", color: "var(--text-muted)", marginTop: "var(--space-12)", paddingTop: "var(--space-12)", borderTop: "1px solid var(--border-hairline)" }}>
              Remarcações e cancelamentos com menos de 4 horas de antecedência têm cobrança de 50% do valor da
              sessão.
            </p>
          </Card>
        )}

        <Button
          variant="primary"
          href={whatsappLink("Olá Humberto, acabei de reservar um horário pelo site!")}
          target="_blank"
          rel="noopener noreferrer"
          iconLeft={<Icon icon={MessageCircle} size={18} />}
        >
          Falar no WhatsApp
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col items-center text-center gap-3">
        <Icon icon={CalendarDays} size={26} style={{ color: "var(--text-accent)" }} />
        <h1>Agendar horário</h1>
        <p style={{ font: "var(--type-caption)", color: "var(--text-muted)" }}>Spaço Lhum · Humberto Bove Massoterapia</p>
      </div>

      <div className="flex flex-col gap-2">
        <span className="ds-eyebrow">Serviço</span>
        <div className="grid grid-cols-2 gap-2">
          {services.map((s) => (
            <ServiceCard
              key={s.id}
              name={s.name}
              duration={`${s.durationMins} min`}
              price={`a partir de ${formatCurrencyBR(s.price)}`}
              selected={s.id === serviceId}
              onSelect={() => handleServiceChange(s.id)}
            />
          ))}
        </div>
      </div>

      <Card padding="var(--space-24)" className="flex flex-col gap-5">
        <Input
          type="date"
          label="Data"
          value={date}
          min={today}
          onChange={(e) => handleDateChange(e.target.value)}
          hint="Horários online de segunda a sexta, das 7h às 19h. Fins de semana são combinados direto."
        />

        {date && (
          <div className="flex flex-col gap-2">
            <span className="ds-eyebrow flex items-center gap-1.5">
              <Icon icon={Clock} size={13} />
              Horários disponíveis
            </span>
            {isWeekend ? (
              <p style={{ font: "var(--type-caption)", color: "var(--text-body)" }}>
                Fins de semana são combinados diretamente.{" "}
                <a href={whatsappLink(fallbackMessage())} target="_blank" rel="noopener noreferrer">
                  Fale no WhatsApp
                </a>{" "}
                pra ver a disponibilidade.
              </p>
            ) : loadingSlots ? (
              <p style={{ font: "var(--type-caption)", color: "var(--text-muted)" }}>Carregando horários…</p>
            ) : slots.length === 0 ? (
              <p style={{ font: "var(--type-caption)", color: "var(--text-body)" }}>
                Nenhum horário disponível nessa data.{" "}
                <a href={whatsappLink(fallbackMessage())} target="_blank" rel="noopener noreferrer">
                  Fale no WhatsApp
                </a>
                .
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {slots.map((slot) => {
                  const time = new Date(slot.start).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "America/Sao_Paulo",
                  });
                  return (
                    <TimeSlot
                      key={slot.start}
                      time={time}
                      state={selectedSlot?.start === slot.start ? "selected" : "available"}
                      onClick={() => setSelectedSlot(slot)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {selectedSlot && (
          <>
            <Input label="Seu nome" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" />
            <Input
              type="tel"
              label="WhatsApp"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(16) 99999-9999"
              iconLeft={<Icon icon={Phone} size={16} />}
              hint="Só para confirmar o horário."
            />
            <Textarea
              label="Observações (opcional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Alguma preferência ou informação?"
            />
          </>
        )}

        {error && (
          <p
            style={{
              font: "var(--type-caption)",
              color: "var(--status-danger)",
              background: "var(--status-danger-soft)",
              borderRadius: "var(--radius-control)",
              padding: "var(--space-8) var(--space-12)",
            }}
          >
            {error}
          </p>
        )}

        <Button variant="primary" fullWidth disabled={!selectedSlot || !name.trim() || !phone.trim() || submitting} onClick={handleSubmit}>
          {submitting ? "Enviando…" : selectedSlot ? "Confirmar reserva" : "Escolha um horário"}
        </Button>
      </Card>
    </div>
  );
}
