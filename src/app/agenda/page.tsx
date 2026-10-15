export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  addDays,
  subDays,
  parseISO,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
import Link from "next/link";
import { nowBR, formatTimeBR } from "@/lib/date";
import { NewAppointmentModal } from "@/components/new-appointment-modal";
import { AppointmentActions } from "@/components/appointment-actions";
import { ClearAgendaButton } from "@/components/clear-agenda-button";
import { BlockSlotModal } from "@/components/block-slot-modal";
import { StatusBadge } from "@/components/status-badge";
import { APPOINTMENT_STATUS } from "@/lib/status-labels";

const DAY_START_HOUR = 7;
const DAY_END_HOUR = 19;

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

  const [appointments, clients, blockedSlots] = await Promise.all([
    view === "week"
      ? (() => {
          const baseDate = week ? parseISO(week) : today;
          const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 });
          const weekEnd = endOfWeek(baseDate, { weekStartsOn: 1 });
          return prisma.appointment.findMany({
            where: {
              startTime: { gte: weekStart, lte: weekEnd },
              status: { not: "CANCELLED" },
            },
            include: { client: true },
            orderBy: { startTime: "asc" },
          });
        })()
      : (() => {
          const dayDate = dateParam ? parseISO(dateParam) : today;
          const dayStart = new Date(
            Date.UTC(
              dayDate.getUTCFullYear(),
              dayDate.getUTCMonth(),
              dayDate.getUTCDate(),
              0, 0, 0
            )
          );
          const dayEnd = new Date(
            Date.UTC(
              dayDate.getUTCFullYear(),
              dayDate.getUTCMonth(),
              dayDate.getUTCDate(),
              23, 59, 59
            )
          );
          return prisma.appointment.findMany({
            where: {
              startTime: { gte: dayStart, lte: dayEnd },
              status: { not: "CANCELLED" },
            },
            include: { client: true },
            orderBy: { startTime: "asc" },
          });
        })(),
    prisma.client.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, phone: true },
    }),
    prisma.blockedSlot.findMany({ orderBy: { startTime: "asc" } }),
  ]);

  const currentDate = dateParam ? parseISO(dateParam) : today;
  const prevDate = format(subDays(currentDate, 1), "yyyy-MM-dd");
  const nextDate = format(addDays(currentDate, 1), "yyyy-MM-dd");
  const todayStr = format(today, "yyyy-MM-dd");
  const currentDateStr = format(currentDate, "yyyy-MM-dd");
  const isToday = currentDateStr === todayStr;

  const baseDate = week ? parseISO(week) : today;
  const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 });
  const prevWeek = format(addWeeks(weekStart, -1), "yyyy-MM-dd");
  const nextWeek = format(addWeeks(weekStart, 1), "yyyy-MM-dd");

  if (view === "day") {
    const apptsByHour: Record<number, typeof appointments> = {};
    for (const appt of appointments) {
      const apptLocal = new Date(appt.startTime.getTime() - 3 * 60 * 60 * 1000);
      const h = apptLocal.getUTCHours();
      if (!apptsByHour[h]) apptsByHour[h] = [];
      apptsByHour[h].push(appt);
    }

    const blockedByHour: Record<number, typeof blockedSlots> = {};
    for (const slot of blockedSlots) {
      const slotLocal = new Date(slot.startTime.getTime() - 3 * 60 * 60 * 1000);
      if (format(slotLocal, "yyyy-MM-dd") !== currentDateStr) continue;
      const h = slotLocal.getUTCHours();
      if (!blockedByHour[h]) blockedByHour[h] = [];
      blockedByHour[h].push(slot);
    }

    // 7h–19h, mais qualquer hora fora dessa faixa que tenha atendimento ou bloqueio.
    const baseHours = Array.from(
      { length: DAY_END_HOUR - DAY_START_HOUR + 1 },
      (_, i) => DAY_START_HOUR + i
    );
    const hourList = Array.from(
      new Set([
        ...baseHours,
        ...Object.keys(apptsByHour).map(Number),
        ...Object.keys(blockedByHour).map(Number),
      ])
    ).sort((a, b) => a - b);

    const blockedSlotsForModal = blockedSlots.map((s) => ({
      ...s,
      startTime: s.startTime.toISOString(),
      endTime: s.endTime.toISOString(),
    }));

    const dayWeekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 5 }, (_, i) => addDays(dayWeekStart, i));

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

          <nav aria-label="Dias da semana" className="grid grid-cols-5 gap-2">
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

          <ol className="flex flex-col">
            {hourList.map((hour) => {
              const hourAppts = apptsByHour[hour] ?? [];
              const hourBlocked = blockedByHour[hour] ?? [];
              const isEmpty = hourAppts.length === 0 && hourBlocked.length === 0;

              return (
                <li key={hour} className="flex gap-3">
                  <span className="w-12 shrink-0 pt-3 text-sm tabular-nums text-gray-500">
                    {String(hour).padStart(2, "0")}:00
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
                        href={`/agenda?date=${currentDateStr}&novo=${String(hour).padStart(2, "0")}:00`}
                        scroll={false}
                        aria-label={`Agendar às ${String(hour).padStart(2, "0")}:00`}
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
                          />
                        </div>
                      </article>
                    ))}
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="flex items-center justify-between gap-3 border-t border-gray-200 pt-4">
            <BlockSlotModal currentDate={currentDateStr} blockedSlots={blockedSlotsForModal} />
            <ClearAgendaButton />
          </div>
        </div>
      </div>
    );
  }

  // ── Week view ──────────────────────────────────────────────
  const byDay: Record<string, typeof appointments> = {};
  for (const appt of appointments) {
    const key = format(appt.startTime, "yyyy-MM-dd");
    if (!byDay[key]) byDay[key] = [];
    byDay[key].push(appt);
  }

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const currentWeekKey = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const isCurrentWeek = format(weekStart, "yyyy-MM-dd") === currentWeekKey;
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

        {/* Celular: um cartão por dia, leva à visão Dia */}
        <ul className="flex flex-col gap-3 md:hidden">
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayAppts = byDay[key] ?? [];
            const isDayToday = key === todayStr;
            const weekend = day.getDay() === 0 || day.getDay() === 6;
            const count = dayAppts.length;

            return (
              <li key={key}>
                <Link
                  href={`/agenda?date=${key}`}
                  className={`flex min-h-14 items-center gap-4 rounded-xl border border-gray-200 p-4 transition-colors hover:bg-gray-50 ${
                    isDayToday ? "bg-amber-50" : "bg-white"
                  }`}
                >
                  <div className="flex w-16 shrink-0 flex-col items-center gap-1">
                    <span className="text-xs capitalize text-gray-500">
                      {format(day, "EEEE", { locale: ptBR })}
                    </span>
                    <span className="font-display text-2xl leading-none text-gray-900">
                      {format(day, "d")}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    {isDayToday && (
                      <p className="text-xs font-medium uppercase tracking-[0.14em] text-amber-700">
                        Hoje
                      </p>
                    )}
                    <p className="text-sm text-gray-700">
                      {count > 0
                        ? `${count} atendimento${count > 1 ? "s" : ""}`
                        : weekend
                          ? "Combinado pelo WhatsApp"
                          : "Sem atendimentos"}
                    </p>
                  </div>
                  <ChevronRight
                    size={18}
                    strokeWidth={1.75}
                    className="shrink-0 text-gray-400"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            );
          })}
        </ul>

        {/* PC: uma coluna por dia */}
        <div className="hidden gap-3 md:grid md:grid-cols-7">
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayAppts = byDay[key] ?? [];
            const isDayToday = key === todayStr;
            const weekend = day.getDay() === 0 || day.getDay() === 6;

            return (
              <section key={key} className="flex min-w-0 flex-col gap-2">
                <div className="flex flex-col items-center gap-1 pb-1 text-center">
                  <span
                    className={`text-xs capitalize ${isDayToday ? "text-violet-700" : "text-gray-500"}`}
                  >
                    {format(day, "EEE", { locale: ptBR })}
                  </span>
                  <Link
                    href={`/agenda?date=${key}`}
                    className={`text-xl font-medium tabular-nums hover:underline ${
                      isDayToday ? "text-violet-700" : "text-gray-900"
                    }`}
                  >
                    {format(day, "d")}
                  </Link>
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${isDayToday ? "bg-violet-600" : "bg-transparent"}`}
                    aria-hidden="true"
                  />
                </div>

                {dayAppts.length === 0 ? (
                  <p className="text-center text-xs text-gray-400">
                    {weekend ? "Combinado pelo WhatsApp" : "Livre"}
                  </p>
                ) : (
                  dayAppts.map((appt) => (
                    <div
                      key={appt.id}
                      className="flex flex-col gap-1 rounded-lg border border-gray-200 bg-white p-2"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs tabular-nums text-gray-500">
                          {formatTimeBR(appt.startTime)}
                        </span>
                        <StatusBadge status={appt.status} map={APPOINTMENT_STATUS} />
                      </div>
                      <p className="truncate text-sm font-medium text-gray-900">
                        {appt.client?.name ?? appt.title}
                      </p>
                    </div>
                  ))
                )}
              </section>
            );
          })}
        </div>

        <div className="flex justify-end border-t border-gray-200 pt-4">
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
