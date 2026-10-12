import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { businessHoursRangeBR } from "@/lib/date";

const BUSINESS_START_H = 8;
const BUSINESS_END_H = 18;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date"); // YYYY-MM-DD (horário Brasil)
  const durationMins = parseInt(searchParams.get("duration") ?? "60");

  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return NextResponse.json({ error: "Parâmetro date obrigatório (YYYY-MM-DD)" }, { status: 400 });
  }

  const { start: businessStart, end: businessEnd } = businessHoursRangeBR(
    dateStr,
    BUSINESS_START_H,
    BUSINESS_END_H
  );

  const existing = await prisma.appointment.findMany({
    where: {
      status: { not: "CANCELLED" },
      startTime: { lt: businessEnd },
      endTime: { gt: businessStart },
    },
    select: { startTime: true, endTime: true },
    orderBy: { startTime: "asc" },
  });

  const durationMs = durationMins * 60 * 1000;
  const slots: { start: string; end: string; available: boolean }[] = [];
  let cursor = businessStart.getTime();

  while (cursor + durationMs <= businessEnd.getTime()) {
    const slotStart = new Date(cursor);
    const slotEnd = new Date(cursor + durationMs);

    const busy = existing.some(
      (appt) => appt.startTime < slotEnd && appt.endTime > slotStart
    );

    slots.push({
      start: slotStart.toISOString(),
      end: slotEnd.toISOString(),
      available: !busy,
    });

    cursor += durationMs;
  }

  return NextResponse.json(slots);
}
