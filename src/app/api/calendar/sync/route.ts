export const maxDuration = 60;

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isCronRequest, hasValidSession } from "@/lib/auth";
import {
  listUpcomingEvents,
  parseEventTitle,
  createCalendarEvent,
} from "@/lib/google-calendar";

// Fica em PUBLIC_PATHS (proxy.ts) por causa do cron, então a autorização é feita aqui:
// o Vercel Cron chama com CRON_SECRET; o botão "Sincronizar agenda" chama logado.
export async function GET(req: Request) {
  return POST(req);
}

export async function POST(req: Request) {
  if (!isCronRequest(req) && !(await hasValidSession(req))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  return sync();
}

async function sync() {
  try {
    // ── Fase 1: Importar eventos do Google Calendar ──────────────
    const events = await listUpcomingEvents(60);
    let processed = 0;

    for (const event of events) {
      if (!event.id || !event.summary || !event.start?.dateTime) continue;

      const { clientName, serviceType } = parseEventTitle(event.summary);
      const startTime = new Date(event.start.dateTime);
      const endTime = new Date(event.end?.dateTime ?? event.start.dateTime);

      // Busca cliente existente — não cria placeholder; clientes são cadastrados pela plataforma
      const client = await prisma.client.findFirst({
        where: { name: { equals: clientName, mode: "insensitive" } },
      });

      await prisma.appointment.upsert({
        where: { googleEventId: event.id },
        update: {
          title: event.summary,
          serviceType,
          startTime,
          endTime,
          status: event.status === "cancelled" ? "CANCELLED" : "SCHEDULED",
          ...(client ? { clientId: client.id } : {}),
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
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
