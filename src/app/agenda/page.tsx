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
import { ChevronLeft, ChevronRight, Calendar, List } from "lucide-react";
import Link from "next/link";
import { nowBR, formatTimeBR } from "@/lib/date";
import { NewAppointmentModal } from "@/components/new-appointment-modal";
import { AppointmentActions } from "@/components/appointment-actions";
import { ClearAgendaButton } from "@/components/clear-agenda-button";
import { BlockSlotModal } from "@/components/block-slot-modal";
import { StatusBadge } from "@/components/status-badge";
import { APPOINTMENT_STATUS } from "@/lib/status-labels";

const WORK_HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7h–20h

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; view?: string; date?: string }>;
}) {
  const { week, view: viewParam, date: dateParam } = await searchParams;
  const today = nowBR();
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

    const blockedSlotsForModal = blockedSlots.map((s) => ({
      ...s,
      startTime: s.startTime.toISOString(),
      endTime: s.endTime.toISOString(),
    }));

    return (
      <div className="p-3 sm:p-6 max-w-3xl mx-auto">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Agenda</h2>
            <p className="text-gray-500 text-sm capitalize">
              {format(currentDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
              {isToday && " · hoje"}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View toggle */}
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden text-xs font-medium">
              <Link
                href="/agenda"
                className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 text-white"
              >
                <Calendar size={13} />
                <span className="hidden sm:inline">Dia</span>
              </Link>
              <Link
                href={`/agenda?view=week`}
                className="flex items-center gap-1.5 px-3 py-2 text-gray-600 hover:bg-gray-50"
              >
                <List size={13} />
                <span className="hidden sm:inline">Semana</span>
              </Link>
            </div>

            {/* Day navigation */}
            <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-1">
              <Link
                href={`/agenda?date=${prevDate}`}
                className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
              >
                <ChevronLeft size={16} />
              </Link>
              {!isToday && (
                <Link
                  href="/agenda"
                  className="text-xs text-violet-600 hover:text-violet-700 px-2 font-medium"
                >
                  Hoje
                </Link>
              )}
              <Link
                href={`/agenda?date=${nextDate}`}
                className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
              >
                <ChevronRight size={16} />
              </Link>
            </div>

            <NewAppointmentModal clients={clients} />
          </div>
        </div>

        <div className="flex justify-end gap-2 mb-2">
          <BlockSlotModal currentDate={currentDateStr} blockedSlots={blockedSlotsForModal} />
          <ClearAgendaButton />
        </div>

        {/* Time grid */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {WORK_HOURS.map((hour) => {
            const hourAppts = apptsByHour[hour] ?? [];
            const hourBlocked = blockedByHour[hour] ?? [];
            const isEmpty = hourAppts.length === 0 && hourBlocked.length === 0;

            return (
              <div
                key={hour}
                className={`flex min-h-[56px] border-b border-gray-50 last:border-0 ${
                  hourBlocked.length > 0 ? "bg-red-50/40" : hourAppts.length > 0 ? "bg-violet-50/30" : ""
                }`}
              >
                {/* Hour label */}
                <div className="w-16 shrink-0 flex items-start justify-end pr-3 pt-3">
                  <span className="text-xs font-medium text-gray-400 tabular-nums">
                    {String(hour).padStart(2, "0")}:00
                  </span>
                </div>

                {/* Appointments or free slot */}
                <div className="flex-1 py-2 px-3 flex flex-col gap-2">
                  {hourBlocked.map((slot) => (
                    <div key={slot.id} className="flex items-center gap-2 bg-red-100 rounded-lg px-3 py-1.5 border border-red-200">
                      <div className="w-1 h-5 rounded-full bg-red-400 shrink-0" />
                      <span className="text-xs font-medium text-red-700">
                        Bloqueado {formatTimeBR(slot.startTime)}–{formatTimeBR(slot.endTime)}
                        {slot.reason && ` · ${slot.reason}`}
                      </span>
                    </div>
                  ))}
                  {isEmpty ? (
                    <span className="text-xs text-gray-200 pt-1">Livre</span>
                  ) : (
                    hourAppts.map((appt) => (
                      <div
                        key={appt.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-white rounded-lg border border-violet-200 px-3 py-2 shadow-sm"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-1 h-8 rounded-full bg-violet-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">
                              {appt.client?.name ?? appt.title}
                            </p>
                            <p className="text-xs text-gray-400">
                              {formatTimeBR(appt.startTime)} –{" "}
                              {formatTimeBR(appt.endTime)}
                              {appt.serviceType && ` · ${appt.serviceType}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap ml-4 sm:ml-0 sm:shrink-0">
                          <StatusBadge status={appt.status} map={APPOINTMENT_STATUS} />
                          <AppointmentActions
                            appointmentId={appt.id}
                            status={
                              appt.status as
                                | "SCHEDULED"
                                | "CONFIRMED"
                                | "DONE"
                                | "CANCELLED"
                            }
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
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

  return (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Agenda</h2>
          <p className="text-gray-500 text-sm">
            {format(weekStart, "dd/MM", { locale: ptBR })} a{" "}
            {format(
              new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000),
              "dd/MM/yyyy",
              { locale: ptBR }
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden text-xs font-medium">
            <Link
              href="/agenda"
              className="flex items-center gap-1.5 px-3 py-2 text-gray-600 hover:bg-gray-50"
            >
              <Calendar size={13} />
              <span className="hidden sm:inline">Dia</span>
            </Link>
            <Link
              href="/agenda?view=week"
              className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 text-white"
            >
              <List size={13} />
              <span className="hidden sm:inline">Semana</span>
            </Link>
          </div>

          {/* Week navigation */}
          <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-1">
            <Link
              href={`/agenda?view=week&week=${prevWeek}`}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
            >
              <ChevronLeft size={16} />
            </Link>
            {!isCurrentWeek && (
              <Link
                href="/agenda?view=week"
                className="text-xs text-violet-600 hover:text-violet-700 px-2 font-medium"
              >
                Hoje
              </Link>
            )}
            <Link
              href={`/agenda?view=week&week=${nextWeek}`}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
            >
              <ChevronRight size={16} />
            </Link>
          </div>

          <NewAppointmentModal clients={clients} />
        </div>
      </div>

      <div className="flex justify-end mb-2">
        <ClearAgendaButton />
      </div>

      <div className="space-y-3">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayAppts = byDay[key] ?? [];
          const isDayToday = key === todayStr;

          return (
            <div
              key={key}
              className={`bg-white rounded-xl border p-4 ${
                isDayToday
                  ? "border-violet-300 ring-1 ring-violet-200"
                  : "border-gray-200"
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    isDayToday
                      ? "bg-violet-600 text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {format(day, "d")}
                </div>
                <p
                  className={`text-sm font-medium capitalize ${
                    isDayToday ? "text-violet-700" : "text-gray-700"
                  }`}
                >
                  {format(day, "EEEE", { locale: ptBR })}
                  {isDayToday && " (hoje)"}
                </p>
                {dayAppts.length > 0 && (
                  <span className="ml-auto text-xs text-gray-400">
                    {dayAppts.length} atendimento{dayAppts.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {dayAppts.length === 0 ? (
                <p className="text-gray-300 text-xs sm:ml-10">Sem atendimentos</p>
              ) : (
                <ul className="space-y-2.5 sm:ml-10">
                  {dayAppts.map((appt) => (
                    <li
                      key={appt.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-3 py-1"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-gray-400 shrink-0 w-14 sm:w-24">
                          {formatTimeBR(appt.startTime)} –{" "}
                          {formatTimeBR(appt.endTime)}
                        </span>
                        <div className="min-w-0">
                          <span className="text-sm font-medium text-gray-800 block truncate">
                            {appt.client?.name ?? appt.title}
                          </span>
                          <span className="text-xs text-gray-400">
                            {appt.serviceType}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap sm:shrink-0 pl-16 sm:pl-0">
                        <StatusBadge status={appt.status} map={APPOINTMENT_STATUS} />
                        <AppointmentActions
                          appointmentId={appt.id}
                          status={
                            appt.status as
                              | "SCHEDULED"
                              | "CONFIRMED"
                              | "DONE"
                              | "CANCELLED"
                          }
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
