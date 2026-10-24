import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createCalendarEvent } from "@/lib/google-calendar";
import { createAppointments } from "@/lib/domain/appointments";
import { DomainError } from "@/lib/domain/errors";
import { z } from "zod";

const createSchema = z.object({
  // Obrigatório, exceto em parceria (cliente da outra massoterapeuta, sem cadastro: vai partnerName).
  clientId: z.string().optional(),
  isPartner: z.boolean().optional(),
  partnerName: z.string().trim().min(1).optional(),
  serviceType: z.string().default("Massagem"),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  notes: z.string().optional(),
  amount: z.number().positive().optional(),
  repeatWeeks: z.number().int().min(2).max(52).optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const appointments = await prisma.appointment.findMany({
    where: {
      ...(from && to
        ? { startTime: { gte: new Date(from), lte: new Date(to) } }
        : {}),
    },
    include: { client: true },
    orderBy: { startTime: "asc" },
  });

  return NextResponse.json(appointments);
}

export async function POST(req: NextRequest) {
  const body = createSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const { serviceType, startTime, endTime, notes, amount, repeatWeeks, isPartner, partnerName, clientId } = body.data;

  let created: Awaited<ReturnType<typeof createAppointments>>;
  try {
    created = await createAppointments({
      clientId: clientId ?? null,
      isPartner: !!isPartner,
      partnerName,
      serviceType,
      start: new Date(startTime),
      end: new Date(endTime),
      notes,
      amount,
      repeatWeeks,
    });
  } catch (e) {
    if (e instanceof DomainError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }

  // Google Agenda: uma ocorrência por vez, best-effort. Falha no Google não desfaz o agendamento.
  for (const appt of created) {
    try {
      const googleEventId = await createCalendarEvent({
        title: appt.title,
        startTime: appt.startTime,
        endTime: appt.endTime,
      });
      await prisma.appointment.update({ where: { id: appt.id }, data: { googleEventId } });
    } catch {
      /* best-effort */
    }
  }

  return NextResponse.json(created[0], { status: 201 });
}

