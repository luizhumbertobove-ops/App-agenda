import { NextRequest, NextResponse, after } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { findConflict, withScheduleLock } from "@/lib/domain/schedule";
import { createCalendarEvent } from "@/lib/google-calendar";
import { sendText } from "@/lib/evolution";
import { getVitrineContent } from "@/lib/vitrine-content";
import { formatDateBR, formatTimeBR } from "@/lib/date";
import { ceilToHour, workRangeForDate } from "@/lib/work-schedule";
import { getWorkSchedule } from "@/lib/settings";
import {
  SESSION_SLOT_MINUTES,
  MIN_LEAD_MINUTES,
} from "@/lib/vitrine";

const bookingSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(10).max(20),
  serviceId: z.string(),
  startTime: z.string().datetime(),
  notes: z.string().trim().max(300).optional(),
  // Campo-isca: invisível para pessoas; robôs costumam preencher.
  website: z.string().optional(),
});

/** Reservas pelo site: até 60 dias à frente, 2 por telefone a cada 24h e 10 por hora no total. */
const MAX_DAYS_AHEAD = 60;
const MAX_PER_PHONE_PER_DAY = 2;
const MAX_PER_HOUR = 10;
const SITE_NOTE = "Agendado pelo site";

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;
}

export async function POST(req: NextRequest) {
  const body = bookingSchema.safeParse(await req.json().catch(() => null));
  if (!body.success || body.data.website) {
    return NextResponse.json({ error: "Não foi possível reservar. Confira os dados." }, { status: 400 });
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
  const work = workRangeForDate(await getWorkSchedule(), dateStr);
  const earliestStart = new Date(Date.now() + MIN_LEAD_MINUTES * 60 * 1000);
  // A vitrine só oferece horas cheias (7h, 8h, 9h...).
  const onGrid = start.getTime() === ceilToHour(start);

  const latestStart = new Date(Date.now() + MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000);

  if (!work || !onGrid || start < work.start || end > work.end || start < earliestStart || start > latestStart) {
    return NextResponse.json(
      { error: "Esse horário não está mais disponível. Escolha outro." },
      { status: 400 }
    );
  }

  // Limites contra abuso (cada reserva manda WhatsApp pelo número do Beto).
  const now = Date.now();
  const [byPhone, lastHour] = await Promise.all([
    prisma.appointment.count({
      where: {
        notes: { startsWith: SITE_NOTE },
        status: { not: "CANCELLED" },
        createdAt: { gte: new Date(now - 24 * 60 * 60 * 1000) },
        client: { phone: { in: [`55${phone}`, phone] } },
      },
    }),
    prisma.appointment.count({
      where: { notes: { startsWith: SITE_NOTE }, createdAt: { gte: new Date(now - 60 * 60 * 1000) } },
    }),
  ]);
  if (byPhone >= MAX_PER_PHONE_PER_DAY || lastHour >= MAX_PER_HOUR) {
    return NextResponse.json(
      { error: "Já recebemos reservas suas há pouco. Para mais horários, fale com o Humberto pelo WhatsApp." },
      { status: 429 }
    );
  }

  const noteText = [SITE_NOTE, notes].filter(Boolean).join(" — ");

  // Conferir o horário e reservar numa transação só, sob a trava da agenda (a mesma do admin):
  // duas pessoas não ficam com o mesmo horário, e um bloqueio também conta como conflito.
  type Reserva = { appointment: { id: string; startTime: Date; endTime: Date }; clientName: string; clientPhone: string };
  let reserva: Reserva | null;
  try {
    reserva = await withScheduleLock(async (tx) => {
        if (await findConflict(tx, { start, end })) return null;

        // O cliente é reconhecido pelo WhatsApp, com ou sem o 55 (a base guarda com 55).
        // Cliente que já existe mantém o nome cadastrado pelo Beto, mesmo se digitar outro.
        const client =
          (await tx.client.findFirst({ where: { phone: { in: [`55${phone}`, phone] } } })) ??
          (await tx.client.create({ data: { name, phone: `55${phone}` } }));

        const appointment = await tx.appointment.create({
          data: {
            clientId: client.id,
            serviceType: service.name,
            title: `${client.name} - ${service.name}`,
            startTime: start,
            endTime: end,
            notes: noteText,
          },
        });
        return { appointment, clientName: client.name, clientPhone: client.phone };
    });
  } catch (err) {
    console.error("[vitrine/agendar] falha ao reservar:", err);
    return NextResponse.json(
      { error: "Não foi possível reservar agora. Tente de novo em instantes." },
      { status: 500 }
    );
  }
  if (!reserva) {
    return NextResponse.json(
      { error: "Esse horário acabou de ser reservado. Escolha outro." },
      { status: 409 }
    );
  }
  const { appointment } = reserva;
  const client = { name: reserva.clientName, phone: reserva.clientPhone };
  const title = `${client.name} - ${service.name}`;

  // Google Agenda e WhatsApp rodam depois da resposta: o cliente vê a confirmação na hora,
  // mesmo se algum desses serviços estiver lento ou fora do ar.
  const serviceName = service.name;
  const dataHora = `${formatDateBR(start)} às ${formatTimeBR(start)}`;

  after(async () => {
    try {
      const googleEventId = await createCalendarEvent({ title, startTime: start, endTime: end });
      await prisma.appointment.update({ where: { id: appointment.id }, data: { googleEventId } });
    } catch (err) {
      console.error("[vitrine/agendar] falha ao criar evento no Google Calendar:", err);
    }

    try {
      const { telefoneWhatsapp } = await getVitrineContent();
      await sendText(
        telefoneWhatsapp.replace(/\D/g, ""),
        `Novo agendamento pelo site\n\n` +
          `Cliente: ${client.name}\n` +
          `Tel: ${client.phone}\n` +
          `Serviço: ${serviceName}\n` +
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
        `Olá, ${client.name.split(" ")[0]}.\n\n` +
          `Seu horário de *${serviceName}* foi reservado para *${dataHora}* no Spaço Lhum.\n\n` +
          `Qualquer imprevisto, é só chamar por aqui. Até lá!`
      );
    } catch (err) {
      console.error("[vitrine/agendar] falha ao confirmar pro cliente pelo WhatsApp:", err);
    }
  });

  return NextResponse.json(
    {
      id: appointment.id,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      serviceName: service.name,
    },
    { status: 201 }
  );
}
