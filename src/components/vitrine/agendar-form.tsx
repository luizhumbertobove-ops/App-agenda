"use client";

import { useState, useMemo } from "react";
import { CalendarDays, Clock, MessageCircle, Phone } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { whatsappLink, isBusinessDay } from "@/lib/vitrine";
import { useSlots } from "@/hooks/use-slots";
import { formatCurrencyBR } from "@/lib/format";
import { Card } from "@/components/vitrine/ds/Card";
import { ServiceCard } from "@/components/vitrine/ds/ServiceCard";
import { Input } from "@/components/vitrine/ds/Input";
import { Textarea } from "@/components/vitrine/ds/Textarea";
import { dur, ease, spring } from "@/components/vitrine/motion/tokens";
import { useVitrineMotion } from "@/components/vitrine/motion/provider";
import { TimeSlot } from "@/components/vitrine/ds/TimeSlot";
import { Button } from "@/components/vitrine/ds/Button";
import { Icon } from "@/components/vitrine/ds/Icon";
import { dateKeyBR, formatTimeBR, TZ_BR } from "@/lib/date";
import type { ServiceOption, SlotOption } from "@/lib/types";

/** Nome e WhatsApp lembrados neste aparelho depois da primeira reserva. */
const CLIENTE_KEY = "bove-cliente";

function clienteSalvo(): { name: string; phone: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const salvo = JSON.parse(localStorage.getItem(CLIENTE_KEY) ?? "null");
    return salvo && typeof salvo.name === "string" && typeof salvo.phone === "string" ? salvo : null;
  } catch {
    return null;
  }
}


function todayBR(): string {
  return dateKeyBR(new Date());
}

export function AgendarForm({
  services,
  initialServiceId,
  whatsapp,
  workDays,
  scheduleText,
}: {
  services: ServiceOption[];
  initialServiceId?: string;
  /** Número do Beto, editável na página Vitrine do app. */
  whatsapp: string;
  /** Dias da semana da jornada ("0" = domingo). */
  workDays: string[];
  /** Resumo da jornada, ex.: "segunda a sexta, das 7h às 19h". */
  scheduleText: string;
}) {
  const [serviceId, setServiceId] = useState(
    initialServiceId && services.some((s) => s.id === initialServiceId)
      ? initialServiceId
      : services[0]?.id ?? ""
  );
  const [date, setDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<SlotOption | null>(null);

  // Os campos só aparecem depois de escolher um horário (já no navegador), então ler o
  // localStorage aqui não causa diferença de hidratação.
  const [lembrado, setLembrado] = useState(() => clienteSalvo());
  const [name, setName] = useState(() => lembrado?.name ?? "");
  const [phone, setPhone] = useState(() => lembrado?.phone ?? "");
  const [notes, setNotes] = useState("");
  // Campo-isca contra robôs (fica escondido; pessoas não preenchem).
  const [website, setWebsite] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState<{
    dateLabel: string;
    serviceName: string;
    isFirstSession: boolean;
  } | null>(null);

  const { reduce, t } = useVitrineMotion();

  const service = services.find((s) => s.id === serviceId);
  const today = useMemo(() => todayBR(), []);
  const isWeekend = date.length > 0 && !isBusinessDay(date, workDays);

  const slotsUrl = date && service && !isWeekend ? `/api/vitrine/availability?date=${date}` : null;
  const { data: fetchedSlots, loading: loadingSlots, refetch: refetchSlots } = useSlots<SlotOption[]>(slotsUrl);
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
          website: website || undefined,
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

      // Dicas de primeira sessão: quando este aparelho nunca reservou antes (a API não diz
      // se o número já é cliente, para não expor isso a qualquer um).
      const primeiraVez = !clienteSalvo();
      try {
        localStorage.setItem(CLIENTE_KEY, JSON.stringify({ name: name.trim(), phone: phone.trim() }));
      } catch {
        // Sem armazenamento (aba anônima etc.): só não lembra da próxima vez.
      }

      setConfirmed({
        dateLabel: new Date(data.startTime).toLocaleString("pt-BR", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: TZ_BR,
        }),
        serviceName: data.serviceName,
        isFirstSession: primeiraVez,
      });
    } catch {
      setError("Não foi possível enviar sua reserva. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  // Estado dos horários: a troca de chave faz o bloco sair (fade) e entrar (subida suave) ao mudar data ou etapa.
  const estadoHorarios = isWeekend ? "fim-de-semana" : loadingSlots ? "carregando" : slots.length === 0 ? "vazio" : "horarios";

  // Entrada em cascata (título, cards, botão): cada item entra um pouco depois do anterior.
  const entradaCascata = (i: number) => ({
    initial: reduce ? false : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: t({ duration: dur.slow, ease: ease.outSoft, delay: 0.25 + i * 0.08 }) },
  });

  // Bloco que abre e fecha pela altura. O overflow hidden corta o anel de foco dos campos,
  // então o bloco tem 4px de respiro interno e margem negativa do mesmo tamanho.
  const blocoAltura = {
    initial: reduce ? false : { height: 0, opacity: 0 },
    animate: { height: "auto", opacity: 1, transition: t({ height: spring, opacity: { duration: dur.base } }) },
    exit: { height: 0, opacity: 0, transition: t({ height: spring, opacity: { duration: dur.base } }) },
  };
  const blocoAlturaStyle = { overflow: "hidden", margin: -4 } as const;

  if (confirmed) {
    return (
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1, transition: t({ duration: dur.enter, ease: ease.outSoft }) }}
        className="flex flex-col items-center text-center gap-4"
      >
        <svg width={48} height={48} viewBox="0 0 52 52" fill="none" aria-hidden="true" style={{ color: "var(--status-success)" }}>
          <motion.circle
            cx="26"
            cy="26"
            r="24"
            stroke="currentColor"
            strokeWidth="2"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1, transition: t({ duration: dur.slow, ease: ease.outSoft }) }}
          />
          <motion.path
            d="M15 27l7 7 15-15"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1, transition: t({ duration: dur.slow, ease: ease.outSoft, delay: dur.slow * 0.6 }) }}
          />
        </svg>
        <motion.div {...entradaCascata(0)} className="flex flex-col gap-2">
          <h1>Sessão confirmada</h1>
          <p style={{ font: "var(--type-body)", color: "var(--text-body)" }}>
            {confirmed.serviceName} · {confirmed.dateLabel}
          </p>
          <p style={{ font: "var(--type-caption)", color: "var(--text-muted)" }}>
            A confirmação chega no WhatsApp. Qualquer coisa, é só chamar.
          </p>
        </motion.div>

        {confirmed.isFirstSession && (
          <motion.div {...entradaCascata(1)} className="w-full">
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
          </motion.div>
        )}

        <motion.div {...entradaCascata(2)}>
          <Button
            variant="primary"
            href={whatsappLink("Olá Humberto, acabei de reservar um horário pelo site!", whatsapp)}
            target="_blank"
            rel="noopener noreferrer"
            iconLeft={<Icon icon={MessageCircle} size={18} />}
          >
            Falar no WhatsApp
          </Button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col items-center text-center gap-3">
        <Icon icon={CalendarDays} size={26} style={{ color: "var(--text-accent)" }} />
        <h1>Agendar horário</h1>
        <p style={{ font: "var(--type-caption)", color: "var(--text-muted)" }}>Spaço Lhum · Humberto Bove Massoterapeuta</p>
      </div>

      <div className="flex flex-col gap-2">
        <span className="ds-eyebrow">Serviço</span>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {services.map((s) => (
            <ServiceCard
              key={s.id}
              name={s.name}
              duration={`${s.durationMins} min`}
              price={`a partir de ${formatCurrencyBR(s.price)}`}
              selected={s.id === serviceId}
              onSelect={() => handleServiceChange(s.id)}
              highlight={
                s.id === serviceId ? (
                  <motion.span
                    layoutId="servico-selecionado"
                    transition={t(spring)}
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: "inherit",
                      boxShadow: "inset 0 0 0 1.5px var(--action-primary)",
                      pointerEvents: "none",
                      zIndex: -1,
                    }}
                  />
                ) : undefined
              }
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
          hint={
            scheduleText
              ? `Horários online: ${scheduleText}. Outros dias são combinados direto.`
              : "Os horários são combinados direto pelo WhatsApp."
          }
        />

        <AnimatePresence initial={false}>
          {date && (
            <motion.div key="horarios" {...blocoAltura} style={blocoAlturaStyle}>
              <div className="flex flex-col gap-2" style={{ padding: 4 }}>
                <span className="ds-eyebrow flex items-center gap-1.5">
                  <Icon icon={Clock} size={13} />
                  Horários disponíveis
                </span>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={`${date}-${estadoHorarios}`}
                    initial={reduce ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0, transition: t({ duration: dur.slow, ease: ease.outSoft }) }}
                    exit={{ opacity: 0, transition: t({ duration: dur.fast }) }}
                    className="flex flex-col gap-2"
                  >
                    {isWeekend ? (
                      <p style={{ font: "var(--type-caption)", color: "var(--text-body)" }}>
                        Esse dia é combinado diretamente.{" "}
                        <a href={whatsappLink(fallbackMessage(), whatsapp)} target="_blank" rel="noopener noreferrer">
                          Fale no WhatsApp
                        </a>{" "}
                        pra ver a disponibilidade.
                      </p>
                    ) : loadingSlots ? (
                      <div aria-busy="true" className="grid grid-cols-3 gap-2">
                        <span className="sr-only">Carregando horários</span>
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                          <span key={i} className="ds-skeleton" aria-hidden="true" />
                        ))}
                      </div>
                    ) : slots.length === 0 ? (
                      <p style={{ font: "var(--type-caption)", color: "var(--text-body)" }}>
                        Nenhum horário disponível nessa data.{" "}
                        <a href={whatsappLink(fallbackMessage(), whatsapp)} target="_blank" rel="noopener noreferrer">
                          Fale no WhatsApp
                        </a>
                        .
                      </p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {slots.map((slot, i) => {
                          const time = formatTimeBR(new Date(slot.start));
                          const selecionado = selectedSlot?.start === slot.start;
                          return (
                            <motion.div
                              key={slot.start}
                              initial={reduce ? false : { opacity: 0, y: 8 }}
                              animate={{
                                opacity: 1,
                                y: 0,
                                transition: t({ duration: dur.base, ease: ease.outSoft, delay: Math.min(i, 8) * 0.03 }),
                              }}
                            >
                              <TimeSlot
                                time={time}
                                state={selecionado ? "selected" : "available"}
                                onClick={() => setSelectedSlot(slot)}
                                highlight={
                                  selecionado ? (
                                    <motion.span
                                      layoutId="slot-selecionado"
                                      transition={t(spring)}
                                      style={{
                                        position: "absolute",
                                        inset: -1,
                                        borderRadius: "inherit",
                                        background: "var(--action-primary)",
                                        zIndex: -1,
                                      }}
                                    />
                                  ) : undefined
                                }
                              />
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {selectedSlot && (
            <motion.div key="dados" {...blocoAltura} style={blocoAlturaStyle}>
              <div className="flex flex-col gap-5" style={{ padding: 4 }}>
                {lembrado ? (
                  <p style={{ font: "var(--type-body)", color: "var(--text-body)" }}>
                    Reservando como <strong>{lembrado.name}</strong>, WhatsApp {lembrado.phone}.{" "}
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          localStorage.removeItem(CLIENTE_KEY);
                        } catch {}
                        setLembrado(null);
                        setName("");
                        setPhone("");
                      }}
                      style={{ color: "var(--action-primary)", textDecoration: "underline" }}
                    >
                      Não é você?
                    </button>
                  </p>
                ) : (
                  <>
                    <Input label="Seu nome" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" />
                    <Input
                      type="tel"
                      label="WhatsApp"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(16) 99999-9999"
                      iconLeft={<Icon icon={Phone} size={16} />}
                      hint="Só para confirmar o horário. Da próxima vez, este aparelho lembra de você."
                    />
                  </>
                )}
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
                />
                <Textarea
                  label="Observações (opcional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Alguma preferência ou informação?"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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

        <Button
          variant="primary"
          fullWidth
          loading={submitting}
          disabled={!selectedSlot || !name.trim() || !phone.trim() || submitting}
          onClick={handleSubmit}
        >
          {submitting ? "Enviando…" : selectedSlot ? "Confirmar reserva" : "Escolha um horário"}
        </Button>
      </Card>
    </div>
  );
}
