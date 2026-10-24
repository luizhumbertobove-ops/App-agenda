import type { Appointment, Client } from "@/generated/prisma/client";
import { formatDateBR } from "@/lib/date";
import { DomainError } from "./errors";
import { findConflict, withScheduleLock } from "./schedule";

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
