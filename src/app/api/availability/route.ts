import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { COMERCIAL, ceilToHour, rangeForHours, workRangeForDate } from "@/lib/work-schedule";
import { getWorkSchedule } from "@/lib/settings";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date"); // YYYY-MM-DD (horário Brasil)
  const durationMins = parseInt(searchParams.get("duration") ?? "60");
  // Ao editar um atendimento, o horário dele mesmo conta como livre.
  const excludeId = searchParams.get("exclude");

  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return NextResponse.json({ error: "Parâmetro date obrigatório (YYYY-MM-DD)" }, { status: 400 });
  }

  // Dentro da jornada do dia. Em dia de folga o Beto ainda pode encaixar alguém
  // (ex.: sábado combinado pelo WhatsApp), então vale o horário comercial padrão.
  const schedule = await getWorkSchedule();
  const { start: businessStart, end: businessEnd } =
    workRangeForDate(schedule, dateStr) ?? rangeForHours(dateStr, COMERCIAL);

  const range = { startTime: { lt: businessEnd }, endTime: { gt: businessStart } };
  const [appointments, blocked] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        status: { not: "CANCELLED" },
        ...range,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { startTime: true, endTime: true },
    }),
    prisma.blockedSlot.findMany({ where: range, select: { startTime: true, endTime: true } }),
  ]);
  // Bloqueios ocupam o horário do mesmo jeito que um atendimento.
  const existing = [...appointments, ...blocked];

  // Atendimentos começam sempre em hora cheia (7h, 8h, 9h...), mesmo os de 50 min:
  // a sessão dura o tempo do serviço, mas a hora inteira fica reservada.
  const HOUR_MS = 60 * 60 * 1000;
  const durationMs = durationMins * 60 * 1000;
  const reservedMs = Math.max(durationMs, HOUR_MS);
  const slots: { start: string; end: string; available: boolean }[] = [];
  let cursor = ceilToHour(businessStart);

  while (cursor + durationMs <= businessEnd.getTime()) {
    const slotStart = new Date(cursor);
    const slotEnd = new Date(cursor + durationMs);
    const reservedEnd = new Date(cursor + reservedMs);

    const busy = existing.some(
      (appt) => appt.startTime < reservedEnd && appt.endTime > slotStart
    );

    slots.push({
      start: slotStart.toISOString(),
      end: slotEnd.toISOString(),
      available: !busy,
    });

    cursor += HOUR_MS;
  }

  return NextResponse.json(slots);
}
