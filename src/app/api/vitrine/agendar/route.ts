import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createCalendarEvent } from "@/lib/google-calendar";
import { sendText } from "@/lib/evolution";
import { formatDateBR, formatTimeBR, businessHoursRangeBR } from "@/lib/date";
import {
  BETO_PHONE,
  BUSINESS_START_H,
  BUSINESS_END_H,
  SESSION_SLOT_MINUTES,
  MIN_LEAD_MINUTES,
  isBusinessDay,
} from "@/lib/vitrine";

const bookingSchema = z.object({
  name: z.string().trim().min(2),
  phone: z.string().trim().min(10),
  serviceId: z.string(),
  startTime: z.string().datetime(),
  notes: z.string().trim().max(300).optional(),
});

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;
}

export async function POST(req: NextRequest) {
  const body = bookingSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }
  const { name, serviceId, startTime, notes } = body.data;
  const phone = normalizePhone(body.data.phone);
  if (phone.length < 10) {
    return NextResponse.json({ error: "Telefone inválido" }, { status: 400 });
  }

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service || !service.active) {
    return NextResponse.json({ error: "Serviço não encontrado" }, { status: 404 });
  }

  const start = new Date(startTime);
  const end = new Date(start.getTime() + SESSION_SLOT_MINUTES * 60 * 1000);
  const dateStr = start.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  const { start: businessStart, end: businessEnd } = businessHoursRangeBR(
    dateStr,
    BUSINESS_START_H,
    BUSINESS_END_H
  );
  const earliestStart = new Date(Date.now() + MIN_LEAD_MINUTES * 60 * 1000);
  const startMinutesBR = Number(
    start.toLocaleTimeString("pt-BR", { minute: "2-digit", timeZone: "America/Sao_Paulo" })
  );

  if (
    !isBusinessDay(dateStr) ||
    start < businessStart ||
    end > businessEnd ||
    start < earliestStart ||
    startMinutesBR !== 0
  ) {
    return NextResponse.json(
      { error: "Esse horário não está mais disponível. Escolha outro." },
      { status: 400 }
    );
  }

  const conflict = await prisma.appointment.findFirst({
    where: { status: { not: "CANCELLED" }, startTime: { lt: end }, endTime: { gt: start } },
  });
  if (conflict) {
    return NextResponse.json(
      { error: "Esse horário acabou de ser reservado. Escolha outro." },
      { status: 409 }
    );
  }

  const client = await prisma.client.upsert({
    where: { phone },
    update: {},
    create: { name, phone },
  });
  const priorAppointments = await prisma.appointment.count({
    where: { clientId: client.id, status: { not: "CANCELLED" } },
  });
  const isFirstSession = priorAppointments === 0;

  const title = `${client.name} - ${service.name}`;
  const noteText = ["Agendado pelo site", notes].filter(Boolean).join(" — ");

  const appointment = await prisma.appointment.create({
    data: {
      clientId: client.id,
      serviceType: service.name,
      title,
      startTime: start,
      endTime: end,
      notes: noteText,
    },
  });

  try {
    const googleEventId = await createCalendarEvent({ title, startTime: start, endTime: end });
    await prisma.appointment.update({ where: { id: appointment.id }, data: { googleEventId } });
  } catch (err) {
    console.error("[vitrine/agendar] falha ao criar evento no Google Calendar:", err);
  }

  const dataHora = `${formatDateBR(start)} às ${formatTimeBR(start)}`;

  try {
    await sendText(
      BETO_PHONE,
      `🔔 Novo agendamento pelo site!\n\n` +
        `Cliente: ${client.name}\n` +
        `Tel: ${client.phone}\n` +
        `Serviço: ${service.name}\n` +
        `Quando: ${dataHora}` +
        (notes ? `\nObs: ${notes}` : "") +
        `\n\nJá está na sua agenda. Confirme com o cliente se precisar ajustar algo.`
    );
  } catch (err) {
    console.error("[vitrine/agendar] falha ao avisar o Beto pelo WhatsApp:", err);
  }

  try {
    await sendText(
      client.phone,
      `Olá ${client.name.split(" ")[0]}! 👋\n\n` +
        `Seu horário de *${service.name}* foi reservado para *${dataHora}* no Spaço Lhum.\n\n` +
        `Qualquer imprevisto, é só chamar por aqui. Até lá! 💆`
    );
  } catch (err) {
    console.error("[vitrine/agendar] falha ao confirmar pro cliente pelo WhatsApp:", err);
  }

  return NextResponse.json(
    {
      id: appointment.id,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      serviceName: service.name,
      isFirstSession,
    },
    { status: 201 }
  );
}
