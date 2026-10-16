export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { format, startOfWeek, addWeeks, addDays, subDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock, Lock } from "lucide-react";
import Link from "next/link";
import { nowBR, formatTimeBR } from "@/lib/date";
import { getWorkSchedule } from "@/lib/settings";
import { hoursForDate, toMinutes, type WorkSchedule } from "@/lib/work-schedule";
import { NewAppointmentModal } from "@/components/new-appointment-modal";
import { AppointmentActions } from "@/components/appointment-actions";
import { ClearAgendaButton } from "@/components/clear-agenda-button";
import { BlockSlotModal } from "@/components/block-slot-modal";
import { StatusBadge } from "@/components/status-badge";
import { APPOINTMENT_STATUS } from "@/lib/status-labels";

const HOUR_MS = 60 * 60 * 1000;

/** Meia-noite (horário de Brasília) de um "YYYY-MM-DD", em milissegundos. */
function dayStartMs(dateStr: string): number {
  return Date.parse(`${dateStr}T00:00:00-03:00`);
}

/** Linhas de hora cobertas pela jornada do dia (8h–18h → 8, 9, ..., 17). Folga = nenhuma. */
function workHourRows(schedule: WorkSchedule, dateStr: string): number[] {
  const hours = hoursForDate(schedule, dateStr);
  if (!hours) return [];
  const first = Math.floor(toMinutes(hours.start) / 60);
  const last = Math.ceil(toMinutes(hours.end) / 60) - 1;
  return Array.from({ length: last - first + 1 }, (_, i) => first + i);
}

/** A hora (0–23, Brasília) está dentro da jornada do dia? Vale também para jornadas quebradas em :30. */
function isWorkHour(schedule: WorkSchedule, dateStr: string, hour: number): boolean {
  const hours = hoursForDate(schedule, dateStr);
  if (!hours) return false;
  return hour * 60 + 60 > toMinutes(hours.start) && hour * 60 < toMinutes(hours.end);
}

type Range = { startTime: Date; endTime: Date };

/** Agrupa por hora do dia: atendimentos pela hora de início; bloqueios em todas as horas que cobrem. */
function bucketByHour<A extends Range, B extends Range>(dateStr: string, appts: A[], blocked: B[]) {
  const base = dayStartMs(dateStr);
  const apptsByHour: Record<number, A[]> = {};
  const blockedByHour: Record<number, B[]> = {};
  for (const appt of appts) {
    const t = appt.startTime.getTime();
    if (t < base || t >= base + 24 * HOUR_MS) continue;
    const h = Math.floor((t - base) / HOUR_MS);
    (apptsByHour[h] ??= []).push(appt);
  }
  for (const slot of blocked) {
    const from = Math.max(slot.startTime.getTime(), base);
    const to = Math.min(slot.endTime.getTime(), base + 24 * HOUR_MS);
    if (from >= to) continue;
    for (let h = Math.floor((from - base) / HOUR_MS); h * HOUR_MS + base < to; h++) {
      (blockedByHour[h] ??= []).push(slot);
    }
  }
  return { apptsByHour, blockedByHour };
}

const hh = (hour: number) => `${String(hour).padStart(2, "0")}:00`;

/** Ponto de cor do cartão na grade semanal, pelo status (o design system não usa borda de um lado só). */
const WEEK_STATUS_DOT: Record<string, string> = {
  SCHEDULED: "bg-blue-400",
  CONFIRMED: "bg-green-500",
  DONE: "bg-amber-400",
};

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; view?: string; date?: string; novo?: string }>;
}) {
  const { week, view: viewParam, date: dateParam, novo } = await searchParams;
  const today = nowBR();
  // Server component dinâmico (render por requisição): ler o relógio aqui é intencional,
  // é o ponto de partida do relógio do AppointmentActions no navegador.
  // eslint-disable-next-line react-hooks/purity
  const renderedAt = Date.now();
  const view = viewParam === "week" ? "week" : "day";

  const currentDate = dateParam ? parseISO(dateParam) : today;
  const prevDate = format(subDays(currentDate, 1), "yyyy-MM-dd");
  const nextDate = format(addDays(currentDate, 1), "yyyy-MM-dd");
  const todayStr = format(today, "yyyy-MM-dd");
  const currentDateStr = format(currentDate, "yyyy-MM-dd");
  const isToday = currentDateStr === todayStr;

  const baseDate = week ? parseISO(week) : today;
  const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 });
  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const prevWeek = format(addWeeks(weekStart, -1), "yyyy-MM-dd");
  const nextWeek = format(addWeeks(weekStart, 1), "yyyy-MM-dd");

  // Limites em horário de Brasília (um atendimento às 22h não pode cair no dia seguinte).
  const rangeStart = new Date(dayStartMs(view === "week" ? weekStartStr : currentDateStr));
  const rangeEnd = new Date(rangeStart.getTime() + (view === "week" ? 7 : 1) * 24 * HOUR_MS);

  const [appointments, clients, blockedSlots, services, schedule] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        startTime: { gte: rangeStart, lt: rangeEnd },
        status: { not: "CANCELLED" },
      },
      include: {
        client: true,
        payments: {
          where: { status: { in: ["PENDING", "SENT", "OVERDUE"] } },
          select: { amount: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { startTime: "asc" },
    }),
    prisma.client.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, phone: true },
    }),
    prisma.blockedSlot.findMany({ orderBy: { startTime: "asc" } }),
    prisma.service.findMany({ select: { name: true, price: true } }),
    getWorkSchedule(),
  ]);

  // Valor sugerido ao concluir: a cobrança em aberto do atendimento ou o preço do serviço.
  const priceByService = new Map(services.map((s) => [s.name, s.price]));
  const suggestedAmount = (appt: (typeof appointments)[number]) =>
    appt.payments[0]?.amount ?? priceByService.get(appt.serviceType) ?? null;

  const jornadaLink = (
    <Link
      href="/agenda/jornada"
      className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
    >
      <Clock size={16} strokeWidth={1.75} aria-hidden="true" />
      Jornada
    </Link>
  );

  if (view === "day") {
    const { apptsByHour, blockedByHour } = bucketByHour(currentDateStr, appointments, blockedSlots);
    const workRows = workHourRows(schedule, currentDateStr);
    const dayOff = workRows.length === 0;

    // Horas da jornada, mais qualquer hora fora dela que tenha atendimento ou bloqueio.
    const hourList = Array.from(
      new Set([
        ...workRows,
        ...Object.keys(apptsByHour).map(Number),
        ...Object.keys(blockedByHour).map(Number),
      ])
    ).sort((a, b) => a - b);

    const blockedSlotsForModal = blockedSlots.map((s) => ({
      ...s,
      startTime: s.startTime.toISOString(),
      endTime: s.endTime.toISOString(),
    }));

    // Faixa de dias: os dias de trabalho da semana (e o dia aberto, se for folga).
    const dayWeekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(dayWeekStart, i)).filter((d) => {
      const key = format(d, "yyyy-MM-dd");
      return key === currentDateStr || workHourRows(schedule, key).length > 0;
    });

    return (
      <div className="mx-auto max-w-7xl px-5 pb-24 pt-6 md:px-8">
        <div className="flex flex-col gap-6 md:mx-auto md:max-w-3xl">
          <AgendaHeader
            view="day"
            anchor={currentDate}
            subtitle={`${format(currentDate, "EEEE, d 'de' MMMM", { locale: ptBR })}${isToday ? " · hoje" : ""}`}
            showToday={!isToday}
            todayHref="/agenda"
            prevHref={`/agenda?date=${prevDate}`}
            nextHref={`/agenda?date=${nextDate}`}
            clients={clients}
            preset={
              novo && /^\d{2}:\d{2}$/.test(novo) ? { date: currentDateStr, time: novo } : undefined
            }
          />

          <nav
            aria-label="Dias da semana"
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${weekDays.length}, minmax(0, 1fr))` }}
          >
            {weekDays.map((d) => {
              const key = format(d, "yyyy-MM-dd");
              const on = key === currentDateStr;
              return (
                <Link
                  key={key}
                  href={`/agenda?date=${key}`}
                  aria-current={on ? "date" : undefined}
                  className={`flex h-14 flex-col items-center justify-center rounded-xl border transition-colors ${
                    on
                      ? "border-violet-600 bg-violet-600 text-white"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span className={`text-xs capitalize ${on ? "text-white/80" : "text-gray-500"}`}>
                    {format(d, "EEE", { locale: ptBR })}
                  </span>
                  <span className="text-lg font-medium leading-none tabular-nums">
                    {format(d, "d")}
                  </span>
                </Link>
              );
            })}
          </nav>

          {dayOff && (
            <p className="rounded-xl bg-gray-100 px-4 py-3 text-sm text-gray-600">
              Dia de folga na sua jornada. Você ainda pode encaixar alguém pelo botão de novo
              agendamento.
            </p>
          )}

          <ol className="flex flex-col">
            {hourList.map((hour) => {
              const hourAppts = apptsByHour[hour] ?? [];
              const hourBlocked = blockedByHour[hour] ?? [];
              const isEmpty = hourAppts.length === 0 && hourBlocked.length === 0;

              return (
                <li key={hour} className="flex gap-3">
                  <span className="w-12 shrink-0 pt-3 text-sm tabular-nums text-gray-500">
                    {hh(hour)}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-2 pb-3">
                    {hourBlocked.map((slot) => (
                      <div
                        key={slot.id}
                        className="flex min-h-12 items-center gap-2 rounded-xl bg-gray-100 px-3 py-2 text-sm text-gray-600"
                      >
                        <Lock size={16} strokeWidth={1.75} className="shrink-0" aria-hidden="true" />
                        <span>
                          Bloqueado {formatTimeBR(slot.startTime)}–{formatTimeBR(slot.endTime)}
                          {slot.reason ? ` · ${slot.reason}` : ""}
                        </span>
                      </div>
                    ))}

                    {isEmpty && (
                      <Link
                        href={`/agenda?date=${currentDateStr}&novo=${hh(hour)}`}
                        scroll={false}
                        aria-label={`Agendar às ${hh(hour)}`}
                        className="flex min-h-12 items-center rounded-xl border border-dashed border-gray-300 px-3 text-sm text-gray-400 transition-colors hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
                      >
                        Livre
                      </Link>
                    )}

                    {hourAppts.map((appt) => (
                      <article
                        key={appt.id}
                        className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            {appt.client ? (
                              <Link
                                href={`/clientes/${appt.client.id}`}
                                className="block truncate text-sm font-medium text-gray-900 hover:underline"
                              >
                                {appt.client.name}
                              </Link>
                            ) : (
                              <p className="truncate text-sm font-medium text-gray-900">
                                {appt.title}
                              </p>
                            )}
                            <p className="text-xs text-gray-500">
                              {formatTimeBR(appt.startTime)}–{formatTimeBR(appt.endTime)}
                              {appt.serviceType ? ` · ${appt.serviceType}` : ""}
                            </p>
                          </div>
                          <StatusBadge status={appt.status} map={APPOINTMENT_STATUS} />
                        </div>
                        <div className="mt-3">
                          <AppointmentActions
                            appointmentId={appt.id}
                            status={
                              appt.status as "SCHEDULED" | "CONFIRMED" | "DONE" | "CANCELLED"
                            }
                            startTime={appt.startTime.toISOString()}
                            serverNow={renderedAt}
                            defaultAmount={suggestedAmount(appt)}
                            clientName={appt.client?.name ?? appt.title}
                            serviceType={appt.serviceType}
                            notes={appt.notes}
                          />
                        </div>
                      </article>
                    ))}
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4">
            <BlockSlotModal currentDate={currentDateStr} blockedSlots={blockedSlotsForModal} />
            <div className="flex items-center gap-1">
              {jornadaLink}
              <ClearAgendaButton />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Visão semanal: grade de hora em hora (rola na horizontal no celular) ──
  const days = Array.from({ length: 7 }, (_, i) => format(addDays(weekStart, i), "yyyy-MM-dd"));
  const buckets = Object.fromEntries(
    days.map((key) => [key, bucketByHour(key, appointments, blockedSlots)])
  );
  const hourList = Array.from(
    new Set(
      days.flatMap((key) => [
        ...workHourRows(schedule, key),
        ...Object.keys(buckets[key].apptsByHour).map(Number),
        ...Object.keys(buckets[key].blockedByHour).map(Number),
      ])
    )
  ).sort((a, b) => a - b);

  const currentWeekKey = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const isCurrentWeek = weekStartStr === currentWeekKey;
  const weekEndDate = addDays(weekStart, 6);

  return (
    <div className="mx-auto max-w-7xl px-5 pb-24 pt-6 md:px-8">
      <div className="flex flex-col gap-6">
        <AgendaHeader
          view="week"
          anchor={baseDate}
          subtitle={`${format(weekStart, "dd/MM")} a ${format(weekEndDate, "dd/MM/yyyy")}`}
          showToday={!isCurrentWeek}
          todayHref="/agenda?view=week"
          prevHref={`/agenda?view=week&week=${prevWeek}`}
          nextHref={`/agenda?view=week&week=${nextWeek}`}
          clients={clients}
        />

        <div className="-mx-5 overflow-x-auto px-5 pb-2 [contain:paint] md:mx-0 md:px-0">
          <div
            role="grid"
            aria-label="Semana de hora em hora"
            className="grid w-max grid-cols-[3rem_repeat(7,6.25rem)] overflow-hidden rounded-xl border border-gray-200 bg-white md:w-auto md:grid-cols-[3rem_repeat(7,minmax(0,1fr))]"
          >
            {/* Cabeçalho: dias */}
            <div className="sticky left-0 z-10 border-b border-gray-200 bg-white" />
            {days.map((key) => {
              const d = parseISO(key);
              const isDayToday = key === todayStr;
              const off = workHourRows(schedule, key).length === 0;
              return (
                <Link
                  key={key}
                  href={`/agenda?date=${key}`}
                  className={`flex flex-col items-center justify-center gap-0.5 border-b border-l border-gray-200 py-2 text-center hover:bg-gray-50 ${
                    isDayToday ? "bg-amber-50" : ""
                  }`}
                >
                  <span
                    className={`text-xs capitalize ${isDayToday ? "text-violet-700" : "text-gray-500"}`}
                  >
                    {format(d, "EEE", { locale: ptBR })}
                  </span>
                  <span
                    className={`text-lg font-medium leading-none tabular-nums ${
                      isDayToday ? "text-violet-700" : "text-gray-900"
                    }`}
                  >
                    {format(d, "d")}
                  </span>
                  {off && <span className="text-[11px] text-gray-400">Folga</span>}
                </Link>
              );
            })}

            {/* Linhas de hora */}
            {hourList.map((hour) => (
              <div key={hour} role="row" className="contents">
                <div className="sticky left-0 z-10 border-t border-gray-100 bg-white pr-2 pt-2 text-right text-xs tabular-nums text-gray-500">
                  {hh(hour)}
                </div>
                {days.map((key) => {
                  const appts = buckets[key].apptsByHour[hour] ?? [];
                  const blocked = buckets[key].blockedByHour[hour] ?? [];
                  const working = isWorkHour(schedule, key, hour);
                  return (
                    <div
                      key={key}
                      role="gridcell"
                      className={`flex min-h-14 flex-col gap-1 border-l border-t border-gray-100 p-1 ${
                        working ? "" : "bg-gray-50"
                      }`}
                    >
                      {blocked.length > 0 && (
                        <div
                          className="flex min-h-11 flex-1 items-center gap-1 rounded-lg bg-gray-100 px-2 text-xs text-gray-500"
                          title={blocked[0].reason ?? undefined}
                        >
                          <Lock size={12} strokeWidth={1.75} className="shrink-0" aria-hidden="true" />
                          Bloqueado
                        </div>
                      )}
                      {appts.map((appt) => (
                        <Link
                          key={appt.id}
                          href={`/agenda?date=${key}`}
                          className={`flex min-h-11 flex-col justify-center rounded-lg border border-gray-200 bg-white px-2 py-1 hover:bg-gray-50 ${
                            appt.status === "DONE" ? "opacity-70" : ""
                          }`}
                        >
                          <span className="flex items-center gap-1 text-[11px] tabular-nums text-gray-500">
                            <span
                              aria-hidden
                              className={`size-1.5 shrink-0 rounded-full ${WEEK_STATUS_DOT[appt.status] ?? "bg-gray-400"}`}
                            />
                            {formatTimeBR(appt.startTime)}
                            <span className="sr-only"> · {APPOINTMENT_STATUS[appt.status]?.label}</span>
                          </span>
                          <span className="truncate text-xs font-medium text-gray-900">
                            {appt.client?.name ?? appt.title}
                          </span>
                        </Link>
                      ))}
                      {working && appts.length === 0 && blocked.length === 0 && (
                        <Link
                          href={`/agenda?date=${key}&novo=${hh(hour)}`}
                          aria-label={`Agendar em ${format(parseISO(key), "d/MM")} às ${hh(hour)}`}
                          className="flex min-h-11 flex-1 items-center justify-center rounded-lg text-xs text-gray-300 transition-colors hover:bg-violet-50 hover:text-violet-700"
                        >
                          Livre
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500" aria-label="Legenda">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-blue-400" aria-hidden /> Agendado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-green-500" aria-hidden /> Confirmado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-amber-400" aria-hidden /> Concluído
          </span>
        </div>

        <div className="flex items-center justify-end gap-1 border-t border-gray-200 pt-4">
          {jornadaLink}
          <ClearAgendaButton />
        </div>
      </div>
    </div>
  );
}

function AgendaHeader({
  view,
  anchor,
  subtitle,
  showToday,
  todayHref,
  prevHref,
  nextHref,
  clients,
  preset,
}: {
  view: "day" | "week";
  anchor: Date;
  subtitle: string;
  showToday: boolean;
  todayHref: string;
  prevHref: string;
  nextHref: string;
  clients: { id: string; name: string; phone: string }[];
  preset?: { date: string; time: string };
}) {
  const tab = (active: boolean) =>
    `inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium transition-colors ${
      active ? "bg-violet-600 text-white" : "text-gray-600 hover:text-gray-900"
    }`;
  const navBtn =
    "inline-flex size-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50";

  return (
    <header className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-amber-700">
            {format(anchor, "MMMM yyyy", { locale: ptBR })}
          </p>
          <h1 className="font-display text-3xl text-gray-900">Agenda</h1>
          <p className="mt-1 text-sm capitalize text-gray-500">{subtitle}</p>
        </div>
        <NewAppointmentModal
          key={preset ? `${preset.date}-${preset.time}` : "novo"}
          clients={clients}
          preset={preset}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <nav
          aria-label="Visão da agenda"
          className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white p-1"
        >
          <Link
            href="/agenda"
            aria-current={view === "day" ? "page" : undefined}
            className={tab(view === "day")}
          >
            Dia
          </Link>
          <Link
            href="/agenda?view=week"
            aria-current={view === "week" ? "page" : undefined}
            className={tab(view === "week")}
          >
            Semana
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {showToday && (
            <Link
              href={todayHref}
              className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium text-violet-700 hover:bg-gray-100"
            >
              Hoje
            </Link>
          )}
          <Link
            href={prevHref}
            aria-label={view === "day" ? "Dia anterior" : "Semana anterior"}
            className={navBtn}
          >
            <ChevronLeft size={20} strokeWidth={1.75} aria-hidden="true" />
          </Link>
          <Link
            href={nextHref}
            aria-label={view === "day" ? "Próximo dia" : "Próxima semana"}
            className={navBtn}
          >
            <ChevronRight size={20} strokeWidth={1.75} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </header>
  );
}
