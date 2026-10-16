import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createCalendarEvent } from "@/lib/google-calendar";
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

  const { serviceType, startTime, endTime, notes, amount, repeatWeeks, isPartner, partnerName } = body.data;
  const clientId = isPartner ? undefined : body.data.clientId;
  if (isPartner ? !partnerName : !clientId) {
    return NextResponse.json(
      { error: isPartner ? "Informe o nome do cliente" : "Escolha o cliente" },
      { status: 400 }
    );
  }
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (end <= start) {
    return NextResponse.json({ error: "Horário de fim deve ser após o início" }, { status: 400 });
  }

  // Verificar conflito de horário
  const conflict = await prisma.appointment.findFirst({
    where: {
      status: { not: "CANCELLED" },
      startTime: { lt: end },
      endTime: { gt: start },
    },
  });

  if (conflict) {
    return NextResponse.json(
      { error: "Conflito de horário com outro agendamento" },
      { status: 409 }
    );
  }

  const client = clientId ? await prisma.client.findUnique({ where: { id: clientId } }) : null;
  if (clientId && !client) {
    return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  }

  const title = `${client?.name ?? partnerName} - ${serviceType}`;

  const durationMs = end.getTime() - start.getTime();
  const recurrenceId = repeatWeeks ? crypto.randomUUID() : undefined;

  // Salvar no banco — inclui ocorrências recorrentes se repeatWeeks > 0
  const totalOccurrences = repeatWeeks ? repeatWeeks : 1;
  const createdAppointments = await Promise.all(
    Array.from({ length: totalOccurrences }, async (_, i) => {
      const occStart = new Date(start.getTime() + i * 7 * 24 * 60 * 60 * 1000);
      const occEnd = new Date(occStart.getTime() + durationMs);
      const appt = await prisma.appointment.create({
        data: {
          clientId: clientId ?? null,
          serviceType,
          title,
          startTime: occStart,
          endTime: occEnd,
          notes,
          recurrenceId,
          isPartner: !!isPartner,
        },
        include: { client: true },
      });
      if (amount) {
        await prisma.payment.create({
          data: { clientId: clientId ?? null, appointmentId: appt.id, amount, status: "PENDING" },
        });
      }
      if (i === 0) {
        try {
          const googleEventId = await createCalendarEvent({ title, startTime: occStart, endTime: occEnd });
          await prisma.appointment.update({ where: { id: appt.id }, data: { googleEventId } });
        } catch { /* best-effort */ }
      }
      return appt;
    })
  );

  const appointment = createdAppointments[0];

  return NextResponse.json(appointment, { status: 201 });
}
