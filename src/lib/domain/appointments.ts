import type {
  Appointment,
  AppointmentStatus,
  Client,
  PaymentStatus,
  Prisma,
} from "@/generated/prisma/client";
import { formatDateBR } from "@/lib/date";
import { DomainError } from "./errors";
import { OPEN_PAYMENT_STATUSES } from "./constants";
import { findConflict, withScheduleLock, type Tx } from "./schedule";

export type CreateAppointmentInput = {
  clientId: string | null;
  isPartner: boolean;
  partnerName?: string;
  serviceType: string;
  start: Date;
  end: Date;
  notes?: string;
  amount?: number;
  repeatWeeks?: number;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Cria o atendimento (e as semanas de recorrência) numa transação só, sob a trava da agenda.
// Qualquer conflito em qualquer semana cancela tudo.
export async function createAppointments(
  input: CreateAppointmentInput,
): Promise<(Appointment & { client: Client | null })[]> {
  const { serviceType, start, end, notes, amount, repeatWeeks, isPartner, partnerName } = input;
  const clientId = isPartner ? null : input.clientId;

  if (end <= start) {
    throw new DomainError("Horário de fim deve ser após o início", 400);
  }
  if (isPartner ? !partnerName : !clientId) {
    throw new DomainError(isPartner ? "Informe o nome do cliente" : "Escolha o cliente", 400);
  }

  const occurrences = repeatWeeks ?? 1;
  const durationMs = end.getTime() - start.getTime();
  const recurrenceId = repeatWeeks ? crypto.randomUUID() : undefined;

  return withScheduleLock(async (tx) => {
    for (let i = 0; i < occurrences; i++) {
      const occStart = new Date(start.getTime() + i * WEEK_MS);
      const occEnd = new Date(occStart.getTime() + durationMs);
      const conflict = await findConflict(tx, { start: occStart, end: occEnd });
      if (conflict) {
        const quando = formatDateBR(conflict.startTime);
        throw new DomainError(
          conflict.kind === "appointment"
            ? `Conflito de horário com outro agendamento em ${quando}`
            : `Horário bloqueado em ${quando}`,
          409,
        );
      }
    }

    const client = clientId ? await tx.client.findUnique({ where: { id: clientId } }) : null;
    if (clientId && !client) {
      throw new DomainError("Cliente não encontrado", 404);
    }

    const title = `${client?.name ?? partnerName} - ${serviceType}`;
    const created: (Appointment & { client: Client | null })[] = [];

    // Sequencial de propósito: dentro da transação, uma escrita por vez.
    for (let i = 0; i < occurrences; i++) {
      const occStart = new Date(start.getTime() + i * WEEK_MS);
      const occEnd = new Date(occStart.getTime() + durationMs);
      const appt = await tx.appointment.create({
        data: {
          clientId: client?.id ?? null,
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
      if (amount && i === 0) {
        await tx.payment.create({
          data: { clientId: client?.id ?? null, appointmentId: appt.id, amount, status: "PENDING" },
        });
      }
      created.push(appt);
    }

    return created;
  });
}

export type UpdateAppointmentInput = {
  status?: AppointmentStatus;
  serviceType?: string;
  clientId?: string;
  startTime?: Date;
  endTime?: Date;
  notes?: string | null;
  sessionNotes?: string | null;
  cancelReason?: string;
  charge?: { amount: number; paid: boolean } | null;
  usePlan?: boolean;
  isPartner?: boolean;
  partnerName?: string;
};

export type UpdateAppointmentResult = {
  appointment: Appointment & { client: Client | null };
  previousClient: Client | null;
  googleEventId: string | null;
  keptPayments: number;
  cancelled: boolean;
  calendarChanged: boolean;
};

// Concluir, reabrir, cancelar e editar o atendimento numa transação só, sob a trava da agenda.
// Efeitos externos (Google, WhatsApp, Mercado Pago) ficam com a rota, fora daqui.
export async function updateAppointment(
  id: string,
  input: UpdateAppointmentInput,
): Promise<UpdateAppointmentResult> {
  return withScheduleLock(async (tx) => {
    // Relê dentro da trava: a checagem de "já concluído" vale só com o status atual.
    const existing = await tx.appointment.findUnique({
      where: { id },
      include: { client: true },
    });
    if (!existing) {
      throw new DomainError("Agendamento não encontrado", 404);
    }

    const wantsDone = input.status === "DONE";
    if (wantsDone && existing.status === "DONE") {
      throw new DomainError("Este atendimento já foi concluído.", 409);
    }
    const wantsReopen =
      existing.status === "DONE" && input.status !== undefined && input.status !== "DONE";
    const cancelling = input.status === "CANCELLED" && existing.status !== "CANCELLED";

    // "Pelo pacote" só com saldo: senão o atendimento seria concluído sem cobrança nenhuma.
    let planSub: { id: string; sessionsUsed: number; sessions: number } | null = null;
    if (wantsDone && input.usePlan) {
      const subs = existing.clientId
        ? await tx.planSubscription.findMany({
            where: { clientId: existing.clientId, active: true },
            include: { plan: true },
            orderBy: { purchasedAt: "asc" },
          })
        : [];
      const sub = subs.find((s) => s.sessionsUsed < s.plan.sessions);
      if (!sub) {
        throw new DomainError("Este cliente não tem sessões sobrando no pacote.", 409);
      }
      planSub = { id: sub.id, sessionsUsed: sub.sessionsUsed, sessions: sub.plan.sessions };
    }

    const data: Prisma.AppointmentUncheckedUpdateInput = {};
    if (input.status !== undefined) data.status = input.status;
    if (input.serviceType !== undefined) data.serviceType = input.serviceType;
    if (input.notes !== undefined) data.notes = input.notes;
    if (input.sessionNotes !== undefined) data.sessionNotes = input.sessionNotes;
    if (input.cancelReason !== undefined) data.cancelReason = input.cancelReason;
    if (input.startTime !== undefined) data.startTime = input.startTime;
    if (input.endTime !== undefined) data.endTime = input.endTime;

    if (wantsDone && planSub) {
      // Concluir pelo pacote usa uma sessão (a do mais antigo com saldo).
      const used = planSub.sessionsUsed + 1;
      await tx.planSubscription.update({
        where: { id: planSub.id },
        data: { sessionsUsed: used, active: used < planSub.sessions },
      });
      data.planSubscriptionId = planSub.id;
    }

    if (wantsDone) {
      await completePayments(tx, existing, input.charge ?? null);
    }

    // Reabrir desfaz a conclusão: lançamento do Concluir sai, cobrança volta, sessão do pacote volta.
    let keptPayments = 0;
    if (wantsReopen) {
      keptPayments = await reopenPayments(tx, id);

      if (existing.planSubscriptionId) {
        const sub = await tx.planSubscription.findUnique({
          where: { id: existing.planSubscriptionId },
        });
        if (sub && sub.sessionsUsed > 0) {
          await tx.planSubscription.update({
            where: { id: sub.id },
            data: { sessionsUsed: sub.sessionsUsed - 1, active: true },
          });
        }
      }
      data.planSubscriptionId = null;
    }

    // Cancelado: a cobrança em aberto sai do "A receber".
    if (cancelling) {
      await tx.payment.updateMany({
        where: { appointmentId: id, status: { in: [...OPEN_PAYMENT_STATUSES] } },
        data: { status: "CANCELLED" },
      });
    }

    const appointment = await tx.appointment.update({
      where: { id },
      data,
      include: { client: true },
    });

    const calendarChanged =
      (input.startTime !== undefined &&
        input.startTime.getTime() !== existing.startTime.getTime()) ||
      (input.endTime !== undefined && input.endTime.getTime() !== existing.endTime.getTime());

    return {
      appointment,
      previousClient: existing.client,
      googleEventId: appointment.googleEventId,
      keptPayments,
      cancelled: cancelling,
      calendarChanged,
    };
  });
}

// Lança o pagamento do Concluir. Reaproveita a cobrança em aberto (guardando como estava)
// em vez de criar outra; sem cobrança, a em aberto vira CANCELLED para não cobrar em dobro.
async function completePayments(
  tx: Tx,
  appt: Appointment,
  charge: { amount: number; paid: boolean } | null,
): Promise<void> {
  const open = await tx.payment.findFirst({
    where: { appointmentId: appt.id, status: { in: [...OPEN_PAYMENT_STATUSES] } },
    orderBy: { createdAt: "desc" },
  });
  // Guarda como a cobrança estava, para o "Reabrir" restaurar.
  const snapshot = open ? { preCompletionStatus: open.status, preCompletionAmount: open.amount } : {};

  if (charge) {
    // "Já recebi" num atendimento que já passou: o dinheiro entrou no dia do atendimento,
    // não no dia em que o Beto lançou (conta no mês certo do Financeiro).
    const now = new Date();
    const paidData = charge.paid
      ? { status: "PAID" as const, paidAt: appt.startTime < now ? appt.startTime : now }
      : {};
    if (open) {
      await tx.payment.update({
        where: { id: open.id },
        data: { amount: charge.amount, ...paidData, ...snapshot },
      });
    } else {
      await tx.payment.create({
        data: {
          appointmentId: appt.id,
          clientId: appt.clientId,
          amount: charge.amount,
          fromCompletion: true,
          ...paidData,
        },
      });
    }
  } else if (open) {
    await tx.payment.update({
      where: { id: open.id },
      data: { status: "CANCELLED", ...snapshot },
    });
  }
}

// Remove o que o Concluir criou e restaura as cobranças como estavam.
// PAID com mpPaymentId (Pix do Mercado Pago) não é mexido. Devolve quantos ficaram.
async function reopenPayments(tx: Tx, appointmentId: string): Promise<number> {
  const auto = await tx.payment.findMany({
    where: { appointmentId, fromCompletion: true },
  });
  const removable = auto.filter((p) => !(p.status === "PAID" && p.mpPaymentId));
  let kept = auto.length - removable.length;
  if (removable.length > 0) {
    await tx.payment.deleteMany({ where: { id: { in: removable.map((p) => p.id) } } });
  }

  const touched = await tx.payment.findMany({
    where: { appointmentId, preCompletionStatus: { not: null } },
  });
  for (const p of touched) {
    if (p.status === "PAID" && p.mpPaymentId) {
      kept++;
      continue;
    }
    await tx.payment.update({
      where: { id: p.id },
      data: {
        status: p.preCompletionStatus as PaymentStatus,
        amount: p.preCompletionAmount ?? p.amount,
        paidAt: null,
        preCompletionStatus: null,
        preCompletionAmount: null,
      },
    });
  }
  return kept;
}
