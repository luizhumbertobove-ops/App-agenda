import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateCalendarEvent, deleteCalendarEvent } from "@/lib/google-calendar";
import { buildNoShowMessage } from "@/lib/evolution";
import { getSettings } from "@/lib/settings";
import { cancelAppointment, updateAppointment } from "@/lib/domain/appointments";
import { sendAndLog } from "@/lib/domain/messaging";
import { DomainError } from "@/lib/domain/errors";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["SCHEDULED", "CONFIRMED", "DONE", "CANCELLED"]).optional(),
  serviceType: z.string().optional(),
  // Ligar o atendimento a um cadastro (ex.: evento importado do Google só com o nome no título).
  clientId: z.string().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  notes: z.string().optional().nullable(),
  sessionNotes: z.string().optional().nullable(),
  cancelReason: z.string().optional(),
  noShow: z.string().optional(),
  // Só junto com status DONE: lançamento no Financeiro (null = não cobrar, ex.: cortesia).
  charge: z.object({ amount: z.number().positive(), paid: z.boolean() }).nullable().optional(),
  // Só junto com status DONE: a sessão sai do pacote ativo do cliente (sem nova cobrança).
  usePlan: z.boolean().optional(),
  // Atendimento em parceria com outra massoterapeuta.
  isPartner: z.boolean().optional(),
  // Nome do cliente da parceria (sem cadastro): vai para o título.
  partnerName: z.string().trim().min(1).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = updateSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const { noShow, startTime, endTime, ...input } = body.data;
  let result;
  try {
    result = await updateAppointment(id, {
      ...input,
      startTime: startTime ? new Date(startTime) : undefined,
      endTime: endTime ? new Date(endTime) : undefined,
    });
  } catch (e) {
    if (e instanceof DomainError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
  const { appointment, previousClient, googleEventId, keptPayments, cancelled, calendarChanged } =
    result;

  // Enviar mensagem de não-compareceu (best-effort)
  if (noShow === "true" && previousClient) {
    try {
      const settings = await getSettings();
      // Mensagem de "Não compareceu" desativada em Mensagens: só marca a falta.
      if (settings.noShowEnabled) {
        const msg = buildNoShowMessage(previousClient.name, settings.noShowTemplate ?? null);
        await sendAndLog(previousClient.phone, {
          clientId: previousClient.id,
          type: "NO_SHOW",
          message: msg,
        });
      }
    } catch {
      // best-effort
    }
  }

  // Sincronizar com GCal (best-effort)
  if (googleEventId) {
    try {
      if (cancelled) {
        await deleteCalendarEvent(googleEventId);
      } else if (calendarChanged) {
        await updateCalendarEvent(googleEventId, {
          title: appointment.title,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
        });
      }
    } catch {
      // best-effort
    }
  }

  return NextResponse.json({ ...appointment, keptPayments });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const reason = new URL(req.url).searchParams.get("reason") ?? undefined;

  let googleEventId: string | null;
  try {
    ({ googleEventId } = await cancelAppointment(id, { reason }));
  } catch (e) {
    if (e instanceof DomainError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }

  const updated = await prisma.appointment.findUnique({ where: { id } });

  if (googleEventId) {
    try {
      await deleteCalendarEvent(googleEventId);
    } catch {
      // best-effort
    }
  }

  return NextResponse.json(updated);
}
