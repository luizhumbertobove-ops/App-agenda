import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type Tx = Prisma.TransactionClient;

// Mesma chave da vitrine (/api/vitrine/agendar): admin e site esperam um ao outro.
export function withScheduleLock<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(424242)`;
      return fn(tx);
    },
    { timeout: 15_000 },
  );
}

// Sobreposição estrita: encostar (um termina quando o outro começa) não conflita.
// Atendimento tem prioridade sobre bloqueio quando os dois batem.
export async function findConflict(
  tx: Tx,
  range: { start: Date; end: Date },
  opts: { excludeAppointmentId?: string } = {},
): Promise<{ kind: "appointment" | "blocked"; startTime: Date } | null> {
  const appointment = await tx.appointment.findFirst({
    where: {
      status: { not: "CANCELLED" },
      id: opts.excludeAppointmentId ? { not: opts.excludeAppointmentId } : undefined,
      startTime: { lt: range.end },
      endTime: { gt: range.start },
    },
    orderBy: { startTime: "asc" },
    select: { startTime: true },
  });
  if (appointment) return { kind: "appointment", startTime: appointment.startTime };

  const block = await tx.blockedSlot.findFirst({
    where: { startTime: { lt: range.end }, endTime: { gt: range.start } },
    orderBy: { startTime: "asc" },
    select: { startTime: true },
  });
  if (block) return { kind: "blocked", startTime: block.startTime };

  return null;
}
