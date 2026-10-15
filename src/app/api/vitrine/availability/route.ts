import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { businessHoursRangeBR } from "@/lib/date";
import { SESSION_SLOT_MINUTES, MIN_LEAD_MINUTES } from "@/lib/vitrine";
import { workRangeForDate } from "@/lib/work-schedule";
import { getWorkSchedule } from "@/lib/settings";

// Horários "isca" (dentro da grade cheia) usados quando o dia ainda não tem
// nenhum agendamento que sirva de âncora para a regra de antes/depois.
const FALLBACK_HOURS = [9, 15];

const MAX_SLOTS = 3;
const SLOT_MS = SESSION_SLOT_MINUTES * 60 * 1000;

type Range = { start: Date; end: Date };

function overlaps(a: Range, existing: Range[]): boolean {
  return existing.some((e) => a.start < e.end && a.end > e.start);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date");

  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return NextResponse.json({ error: "Parâmetro date obrigatório (YYYY-MM-DD)" }, { status: 400 });
  }
  // Dia de folga na jornada do Beto: a vitrine não oferece horários.
  const work = workRangeForDate(await getWorkSchedule(), dateStr);
  if (!work) {
    return NextResponse.json([]);
  }
  const { start: businessStart, end: businessEnd } = work;
  const earliestStart = new Date(Date.now() + MIN_LEAD_MINUTES * 60 * 1000);

  const range = { startTime: { lt: businessEnd }, endTime: { gt: businessStart } };
  const [appointments, blocked] = await Promise.all([
    prisma.appointment.findMany({
      where: { status: { not: "CANCELLED" }, ...range },
      select: { startTime: true, endTime: true },
      orderBy: { startTime: "asc" },
    }),
    prisma.blockedSlot.findMany({ where: range, select: { startTime: true, endTime: true } }),
  ]);
  const existingRanges: Range[] = appointments.map((a) => ({ start: a.startTime, end: a.endTime }));
  // Bloqueios tiram o horário da oferta, mas não servem de âncora para o "antes/depois".
  const blockedRanges: Range[] = blocked.map((b) => ({ start: b.startTime, end: b.endTime }));

  // Grade de horários cheios (7h, 8h, 9h... até o último que cabe antes do fechamento).
  const grid: Range[] = [];
  for (let t = businessStart.getTime(); t + SLOT_MS <= businessEnd.getTime(); t += SLOT_MS) {
    grid.push({ start: new Date(t), end: new Date(t + SLOT_MS) });
  }

  function isFree(slot: Range): boolean {
    return (
      slot.start >= earliestStart && !overlaps(slot, existingRanges) && !overlaps(slot, blockedRanges)
    );
  }

  function isAdjacentToBusy(index: number): boolean {
    const prev = grid[index - 1];
    const next = grid[index + 1];
    return (!!prev && overlaps(prev, existingRanges)) || (!!next && overlaps(next, existingRanges));
  }

  const candidates = new Map<number, Range>();

  grid.forEach((slot, i) => {
    if (isFree(slot) && isAdjacentToBusy(i)) {
      candidates.set(slot.start.getTime(), slot);
    }
  });

  if (candidates.size === 0) {
    for (const hour of FALLBACK_HOURS) {
      const targetMs = businessHoursRangeBR(dateStr, hour, hour).start.getTime();
      const slot = grid.find((s) => s.start.getTime() === targetMs);
      if (slot && isFree(slot)) candidates.set(slot.start.getTime(), slot);
    }
  }

  const slots = Array.from(candidates.values())
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, MAX_SLOTS)
    .map((r) => ({ start: r.start.toISOString(), end: r.end.toISOString() }));

  return NextResponse.json(slots);
}
