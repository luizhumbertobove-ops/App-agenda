import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateCalendarEvent, deleteCalendarEvent, parseEventTitle } from "@/lib/google-calendar";
import { sendText, buildNoShowMessage } from "@/lib/evolution";
import { getSettings } from "@/lib/settings";
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
  // Só junto com status DONE: lançamento no Financeiro (null = não cobrar, ex.: plano ou cortesia).
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

  const { noShow, charge, usePlan, partnerName, ...data } = body.data;
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

  const completing = data.status === "DONE" && existing.status !== "DONE";
  const reopening = existing.status === "DONE" && data.status !== undefined && data.status !== "DONE";

  // Concluir pelo pacote: usa uma sessão do pacote ativo (o mais antigo com saldo).
  let planUsedId: string | null = null;
  if (completing && usePlan && existing.clientId) {
    const subs = await prisma.planSubscription.findMany({
      where: { clientId: existing.clientId, active: true },
      include: { plan: true },
      orderBy: { purchasedAt: "asc" },
    });
    const sub = subs.find((s) => s.sessionsUsed < s.plan.sessions);
    if (sub) {
      const used = sub.sessionsUsed + 1;
      await prisma.planSubscription.update({
        where: { id: sub.id },
        data: { sessionsUsed: used, active: used < sub.plan.sessions },
      });
      planUsedId = sub.id;
    }
  }

  // Concluir lança no Financeiro: reaproveita a cobrança em aberto do atendimento, se houver.
  if (completing && charge) {
    const paidData = charge.paid
      ? { status: "PAID" as const, paidAt: new Date() }
      : {};
    const open = await prisma.payment.findFirst({
      where: { appointmentId: id, status: { in: ["PENDING", "SENT", "OVERDUE"] } },
      orderBy: { createdAt: "desc" },
    });
    if (open) {
      await prisma.payment.update({
        where: { id: open.id },
        data: { amount: charge.amount, ...paidData },
      });
    } else {
      await prisma.payment.create({
        data: {
          appointmentId: id,
          clientId: existing.clientId,
          amount: charge.amount,
          fromCompletion: true,
          ...paidData,
        },
      });
    }
  }

  // Reabrir desfaz a conclusão: remove o lançamento automático e devolve a sessão do plano.
  // Pix pago pelo Mercado Pago não é apagado (o dinheiro entrou de verdade).
  let keptPayments = 0;
  if (reopening) {
    const auto = await prisma.payment.findMany({ where: { appointmentId: id, fromCompletion: true } });
    const removable = auto.filter((p) => !(p.status === "PAID" && p.mpPaymentId));
    keptPayments = auto.length - removable.length;
    if (removable.length > 0) {
      await prisma.payment.deleteMany({ where: { id: { in: removable.map((p) => p.id) } } });
    }
    // Devolve a sessão ao pacote que foi usado nesta conclusão (se foi).
    if (existing.planSubscriptionId) {
      const sub = await prisma.planSubscription.findUnique({ where: { id: existing.planSubscriptionId } });
      if (sub && sub.sessionsUsed > 0) {
        await prisma.planSubscription.update({
          where: { id: sub.id },
          data: { sessionsUsed: sub.sessionsUsed - 1, active: true },
        });
      }
    }
  }

  // O título só muda se o serviço mudar. Atendimento importado do Google pode não ter
  // cadastro de cliente: aí o nome é o que já está no título ("Caio - Massagem").
  const serviceChanged = data.serviceType !== undefined && data.serviceType !== existing.serviceType;
  const newClient =
    data.clientId && data.clientId !== existing.clientId
      ? await prisma.client.findUnique({ where: { id: data.clientId } })
      : null;
  if (data.clientId && data.clientId !== existing.clientId && !newClient) {
    return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  }
  const clientLabel =
    newClient?.name ?? partnerName ?? existing.client?.name ?? parseEventTitle(existing.title).clientName;
  const titleChanged = serviceChanged || !!newClient || (!!partnerName && partnerName !== parseEventTitle(existing.title).clientName);
  const title = titleChanged ? `${clientLabel} - ${serviceType}` : existing.title;

  // Cobranças do atendimento que estavam sem cliente passam a ser do cliente escolhido.
  if (newClient) {
    await prisma.payment.updateMany({
      where: { appointmentId: id, clientId: null },
      data: { clientId: newClient.id },
    });
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: {
      ...data,
      startTime,
      endTime,
      title,
      ...(planUsedId ? { planSubscriptionId: planUsedId } : {}),
      ...(reopening ? { planSubscriptionId: null } : {}),
      // Parceria não tem cadastro: ao marcar, desliga o cliente.
      ...(data.isPartner ? { clientId: null } : {}),
    },
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
      } else if (data.startTime || data.endTime || titleChanged) {
        await updateCalendarEvent(existing.googleEventId, { title, startTime, endTime });
      }
    } catch {
      // best-effort
    }
  }

  return NextResponse.json({ ...updated, keptPayments });
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
