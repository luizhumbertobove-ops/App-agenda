import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateCalendarEvent, deleteCalendarEvent, parseEventTitle } from "@/lib/google-calendar";
import { sendText, buildNoShowMessage } from "@/lib/evolution";
import { getSettings } from "@/lib/settings";
import { z } from "zod";
import { clientPlansWhere, pickPlanWithBalance } from "@/lib/plan-access";

const OPEN_STATUSES = ["PENDING", "SENT", "OVERDUE"] as const;

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

/** Cobranças em aberto do atendimento passam a canceladas (fora dos totais, ficam no histórico). */
async function cancelOpenPayments(appointmentId: string) {
  await prisma.payment.updateMany({
    where: { appointmentId, status: { in: [...OPEN_STATUSES] } },
    data: { status: "CANCELLED" },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = updateSchema.safeParse(await req.json().catch(() => null));
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

  // Parceria e cadastro não se misturam: marcar parceria desliga o cliente; ligar um cliente
  // desliga a parceria.
  const toPartner = data.isPartner === true;
  const newClient =
    !toPartner && data.clientId && data.clientId !== existing.clientId
      ? await prisma.client.findUnique({ where: { id: data.clientId } })
      : null;
  if (!toPartner && data.clientId && data.clientId !== existing.clientId && !newClient) {
    return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  }

  const wantsDone = data.status === "DONE" && existing.status !== "DONE";
  const wantsReopen =
    existing.status === "DONE" && data.status !== undefined && data.status !== "DONE";
  const cancelling = data.status === "CANCELLED" && existing.status !== "CANCELLED";

  // "Pelo pacote" só com saldo: senão o atendimento seria concluído sem cobrança nenhuma.
  let planSub: { id: string; sessionsUsed: number; sessions: number } | null = null;
  if (wantsDone && usePlan) {
    const subs = existing.clientId
      ? await prisma.planSubscription.findMany({
          where: { ...clientPlansWhere(existing.clientId), active: true },
          include: { plan: true },
          orderBy: { purchasedAt: "asc" },
        })
      : [];
    const sub = pickPlanWithBalance(subs);
    if (!sub) {
      return NextResponse.json(
        { error: "Este cliente não tem sessões sobrando no pacote." },
        { status: 409 }
      );
    }
    planSub = { id: sub.id, sessionsUsed: sub.sessionsUsed, sessions: sub.plan.sessions };
  }

  // Trava contra concluir/reabrir duas vezes ao mesmo tempo (toque duplo, dois aparelhos):
  // só um pedido consegue mudar o status; o outro não lança nada no Financeiro.
  let completing = false;
  if (wantsDone) {
    const lock = await prisma.appointment.updateMany({
      where: { id, status: { not: "DONE" } },
      data: { status: "DONE" },
    });
    if (lock.count === 0) {
      return NextResponse.json({ error: "Este atendimento já foi concluído." }, { status: 409 });
    }
    completing = true;
  }
  let reopening = false;
  if (wantsReopen) {
    const lock = await prisma.appointment.updateMany({
      where: { id, status: "DONE" },
      data: { status: data.status },
    });
    reopening = lock.count > 0;
  }

  // Concluir pelo pacote: usa uma sessão do pacote (o mais antigo com saldo).
  let planUsedId: string | null = null;
  if (completing && planSub) {
    // Incremento condicional: dois membros concluindo juntos não passam do total do pacote.
    const usedNow = await prisma.planSubscription.updateMany({
      where: { id: planSub.id, sessionsUsed: { lt: planSub.sessions } },
      data: { sessionsUsed: { increment: 1 } },
    });
    if (usedNow.count === 0) {
      // Outro atendimento usou a última sessão no meio do caminho: desfaz a trava de status.
      await prisma.appointment.update({ where: { id }, data: { status: existing.status } });
      return NextResponse.json(
        { error: "Este cliente não tem sessões sobrando no pacote." },
        { status: 409 }
      );
    }
    await prisma.planSubscription.updateMany({
      where: { id: planSub.id, sessionsUsed: { gte: planSub.sessions } },
      data: { active: false },
    });
    planUsedId = planSub.id;
  }

  if (completing) {
    const open = await prisma.payment.findFirst({
      where: { appointmentId: id, status: { in: [...OPEN_STATUSES] } },
      orderBy: { createdAt: "desc" },
    });
    // Guarda como a cobrança estava, para o "Reabrir" restaurar.
    const snapshot = open ? { preCompletionStatus: open.status, preCompletionAmount: open.amount } : {};

    if (charge) {
      // "Já recebi" num atendimento que já passou: o dinheiro entrou no dia do atendimento,
      // não no dia em que o Beto lançou (conta no mês certo do Financeiro).
      const now = new Date();
      const paidData = charge.paid
        ? { status: "PAID" as const, paidAt: existing.startTime < now ? existing.startTime : now }
        : {};
      if (open) {
        // Reaproveita a cobrança em aberto do atendimento em vez de criar outra.
        await prisma.payment.update({
          where: { id: open.id },
          data: { amount: charge.amount, ...paidData, ...snapshot },
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
    } else if (open) {
      // Pelo pacote ou sem cobrança: a cobrança em aberto não vale mais (senão cobraria em dobro).
      await prisma.payment.update({
        where: { id: open.id },
        data: { status: "CANCELLED", ...snapshot },
      });
    }
  }

  // Reabrir desfaz a conclusão: remove o lançamento criado ao concluir, restaura a cobrança
  // que já existia e devolve a sessão do pacote. Pix pago pelo Mercado Pago não é mexido.
  let keptPayments = 0;
  if (reopening) {
    const auto = await prisma.payment.findMany({ where: { appointmentId: id, fromCompletion: true } });
    const removable = auto.filter((p) => !(p.status === "PAID" && p.mpPaymentId));
    keptPayments = auto.length - removable.length;
    if (removable.length > 0) {
      await prisma.payment.deleteMany({ where: { id: { in: removable.map((p) => p.id) } } });
    }

    const touched = await prisma.payment.findMany({
      where: { appointmentId: id, preCompletionStatus: { not: null } },
    });
    for (const p of touched) {
      if (p.status === "PAID" && p.mpPaymentId) {
        keptPayments++;
        continue;
      }
      await prisma.payment.update({
        where: { id: p.id },
        data: {
          status: p.preCompletionStatus as (typeof OPEN_STATUSES)[number],
          amount: p.preCompletionAmount ?? p.amount,
          paidAt: null,
          preCompletionStatus: null,
          preCompletionAmount: null,
        },
      });
    }

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

  // Cancelado (ou "Faltou"): a cobrança em aberto sai do "A receber".
  if (cancelling) await cancelOpenPayments(id);

  // O título só muda se o serviço, o cliente ou o nome da parceria mudar. Atendimento importado
  // do Google pode não ter cadastro: aí o nome é o que já está no título ("Caio - Massagem").
  const titleName = parseEventTitle(existing.title).clientName;
  const serviceChanged = data.serviceType !== undefined && data.serviceType !== existing.serviceType;
  const clientLabel = toPartner
    ? partnerName ?? titleName
    : newClient?.name ?? existing.client?.name ?? titleName;
  const titleChanged =
    serviceChanged || !!newClient || (toPartner && !!partnerName && partnerName !== titleName);
  const title = titleChanged ? `${clientLabel} - ${serviceType}` : existing.title;

  // Cobranças do atendimento que estavam sem cliente passam a ser do cliente escolhido.
  if (newClient) {
    await prisma.payment.updateMany({
      where: { appointmentId: id, clientId: null },
      data: { clientId: newClient.id },
    });
  }

  const { clientId: _clientId, ...rest } = data;
  void _clientId;
  const updated = await prisma.appointment.update({
    where: { id },
    data: {
      ...rest,
      startTime,
      endTime,
      title,
      ...(planUsedId ? { planSubscriptionId: planUsedId } : {}),
      ...(reopening ? { planSubscriptionId: null } : {}),
      ...(toPartner ? { clientId: null } : newClient ? { clientId: newClient.id, isPartner: false } : {}),
    },
    include: { client: true },
  });

  // Enviar mensagem de não-compareceu (best-effort)
  if (noShow === "true" && existing.client) {
    try {
      const settings = await getSettings();
      // Mensagem de "Não compareceu" desativada em Mensagens: só marca a falta.
      if (settings.noShowEnabled) {
        const msg = buildNoShowMessage(existing.client.name, settings.noShowTemplate ?? null);
        await sendText(existing.client.phone, msg);
        await prisma.whatsappLog.create({
          data: { clientId: existing.client.id, type: "NO_SHOW", message: msg, status: "sent" },
        });
      }
    } catch {
      // best-effort
    }
  }

  // Sincronizar com GCal (best-effort)
  if (existing.googleEventId) {
    try {
      if (cancelling) {
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
  // A cobrança em aberto do atendimento cancelado sai do "A receber".
  await cancelOpenPayments(id);

  if (existing.googleEventId) {
    try {
      await deleteCalendarEvent(existing.googleEventId);
    } catch {
      // best-effort
    }
  }

  return NextResponse.json(updated);
}
