import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateCalendarEvent, deleteCalendarEvent } from "@/lib/google-calendar";
import { sendText, buildNoShowMessage } from "@/lib/evolution";
import { getSettings } from "@/lib/settings";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["SCHEDULED", "CONFIRMED", "DONE", "CANCELLED"]).optional(),
  serviceType: z.string().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  notes: z.string().optional().nullable(),
  sessionNotes: z.string().optional().nullable(),
  cancelReason: z.string().optional(),
  noShow: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = updateSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.appointment.findUnique({
    where: { id },
    include: { client: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
  }

  const { noShow, ...data } = body.data;
  const startTime = data.startTime ? new Date(data.startTime) : existing.startTime;
  const endTime = data.endTime ? new Date(data.endTime) : existing.endTime;
  const serviceType = data.serviceType ?? existing.serviceType;

  // Verificar conflito se horário mudou
  if (data.startTime || data.endTime) {
    const conflict = await prisma.appointment.findFirst({
      where: {
        id: { not: id },
        status: { not: "CANCELLED" },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });
    if (conflict) {
      return NextResponse.json(
        { error: "Conflito de horário com outro agendamento" },
        { status: 409 }
      );
    }
  }

  // Incrementar sessões do plano ao concluir
  if (data.status === "DONE" && existing.status !== "DONE" && existing.clientId) {
    const activePlan = await prisma.planSubscription.findFirst({
      where: { clientId: existing.clientId, active: true },
    });
    if (activePlan) {
      await prisma.planSubscription.update({
        where: { id: activePlan.id },
        data: { sessionsUsed: { increment: 1 } },
      });
    }
  }

  const title = `${existing.client?.name ?? "Cliente"} - ${serviceType}`;

  const updated = await prisma.appointment.update({
    where: { id },
    data: { ...data, startTime, endTime, title },
    include: { client: true },
  });

  // Enviar mensagem de não-compareceu (best-effort)
  if (noShow === "true" && existing.client) {
    try {
      const settings = await getSettings();
      const msg = buildNoShowMessage(existing.client.name, settings.noShowTemplate ?? null);
      await sendText(existing.client.phone, msg);
      await prisma.whatsappLog.create({
        data: { clientId: existing.client.id, type: "NO_SHOW", message: msg, status: "sent" },
      });
    } catch {
      // best-effort
    }
  }

  // Sincronizar com GCal (best-effort)
  if (existing.googleEventId) {
    try {
      if (data.status === "CANCELLED") {
        await deleteCalendarEvent(existing.googleEventId);
      } else if (data.startTime || data.endTime || data.serviceType) {
        await updateCalendarEvent(existing.googleEventId, { title, startTime, endTime });
      }
    } catch {
      // best-effort
    }
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const reason = searchParams.get("reason") ?? undefined;

  const existing = await prisma.appointment.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: { status: "CANCELLED", cancelReason: reason },
  });

  if (existing.googleEventId) {
    try {
      await deleteCalendarEvent(existing.googleEventId);
    } catch {
      // best-effort
    }
  }

  return NextResponse.json(updated);
}
