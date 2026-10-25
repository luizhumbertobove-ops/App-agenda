export const maxDuration = 60;

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isCronRequest, hasValidSession } from "@/lib/auth";
import {
  listEventsBetween,
  parseEventTitle,
  createCalendarEvent,
} from "@/lib/google-calendar";
import { cancelAppointment } from "@/lib/domain/appointments";
import { DomainError } from "@/lib/domain/errors";

/** Carência para o que o app acabou de criar: o evento no Google sai depois da resposta. */
const SYNC_GRACE_MS = 5 * 60 * 1000;

// Fica em PUBLIC_PATHS (proxy.ts) por causa do cron, então a autorização é feita aqui:
// o Vercel Cron chama com CRON_SECRET; o botão "Sincronizar agenda" chama logado.
// GET só para o Vercel Cron: um link aberto no navegador não dispara sincronização.
export async function GET(req: Request) {
  if (!isCronRequest(req)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  return POST(req);
}

// Por padrão importa de agora até 60 dias. Com ?from=YYYY-MM-DD&to=YYYY-MM-DD importa
// um período (inclusive o passado), ex.: o mês inteiro.
export async function POST(req: Request) {
  if (!isCronRequest(req) && !(await hasValidSession(req))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const isDate = (v: string | null) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  if (isDate(fromParam) && isDate(toParam)) {
    const from = new Date(`${fromParam}T00:00:00-03:00`);
    const to = new Date(new Date(`${toParam}T00:00:00-03:00`).getTime() + 24 * 60 * 60 * 1000);
    return sync(from, to);
  }
  const to = new Date();
  to.setDate(to.getDate() + 60);
  return sync(new Date(), to);
}

async function sync(from: Date, to: Date) {
  try {
    // ── Fase 1: Importar eventos do Google Calendar ──────────────
    const events = await listEventsBetween(from, to);
    let processed = 0;

    for (const event of events) {
      if (!event.id) continue;

      // Evento apagado no Google (vem quase vazio): cancela o atendimento no app, libera o
      // horário (vitrine incluída) e tira a cobrança em aberto do "A receber". Concluído fica.
      if (event.status === "cancelled") {
        const appt = await prisma.appointment.findUnique({
          where: { googleEventId: event.id },
          select: { id: true },
        });
        if (appt) {
          try {
            await cancelAppointment(appt.id, { reason: "Apagado no Google Agenda", keepDone: true });
          } catch (err) {
            // Atendimento sumiu no meio da sincronização: segue para o próximo evento.
            if (!(err instanceof DomainError && err.status === 404)) throw err;
          }
        }
        continue;
      }

      if (!event.summary || !event.start?.dateTime) continue;

      const { clientName, serviceType } = parseEventTitle(event.summary);
      const startTime = new Date(event.start.dateTime);
      const endTime = new Date(event.end?.dateTime ?? event.start.dateTime);

      // Busca cliente existente — não cria placeholder; clientes são cadastrados pela plataforma
      const client = await prisma.client.findFirst({
        where: { name: { equals: clientName, mode: "insensitive" } },
      });
      // Só preenche o cliente se o atendimento ainda não tem um (não desfaz o que o Beto ligou
      // à mão) e nunca em atendimento de parceria (cliente da outra massoterapeuta).
      const current = await prisma.appointment.findUnique({
        where: { googleEventId: event.id },
        select: { clientId: true, isPartner: true },
      });
      // Evento recém-criado pelo app (o POST grava o googleEventId logo depois da resposta):
      // espera a próxima sincronização, senão viraria um atendimento duplicado.
      if (!current && event.created && Date.now() - Date.parse(event.created) < SYNC_GRACE_MS) {
        continue;
      }
      const linkClient = client && !current?.clientId && !current?.isPartner;

      await prisma.appointment.upsert({
        where: { googleEventId: event.id },
        update: {
          title: event.summary,
          serviceType,
          startTime,
          endTime,
          // Mantém o status marcado no app (confirmado, concluído...).
          ...(linkClient ? { clientId: client.id } : {}),
        },
        create: {
          googleEventId: event.id,
          clientId: client?.id ?? null,
          title: event.summary,
          serviceType,
          startTime,
          endTime,
        },
      });

      processed++;
    }

    // ── Fase 2: Exportar agendamentos sem googleEventId para o GCal ──
    const unsynced = await prisma.appointment.findMany({
      where: {
        googleEventId: null,
        status: { not: "CANCELLED" },
        startTime: { gte: new Date() },
        // Recém-criados ainda estão ganhando o evento no POST (after): exportar agora duplicaria.
        createdAt: { lt: new Date(Date.now() - SYNC_GRACE_MS) },
      },
      include: { client: true },
    });

    let exported = 0;
    for (const appt of unsynced) {
      try {
        const googleEventId = await createCalendarEvent({
          title: appt.title,
          startTime: appt.startTime,
          endTime: appt.endTime,
        });
        await prisma.appointment.update({
          where: { id: appt.id },
          data: { googleEventId },
        });
        exported++;
      } catch {
        // Continua para os próximos
      }
    }

    await prisma.syncLog.create({ data: { eventsProcessed: processed } });

    return NextResponse.json({ ok: true, processed, exported });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.syncLog.create({ data: { errors: message } });
    // invalid_grant = a autorização do Google expirou ou foi revogada: precisa reconectar.
    const reconnect = message.includes("invalid_grant");
    return NextResponse.json({ ok: false, error: message, reconnect }, { status: 500 });
  }
}
