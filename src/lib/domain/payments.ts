import type { Payment } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { OPEN_PAYMENT_STATUSES } from "./constants";

/** Cobrança em aberto mais recente do atendimento (inclusive vencida), para reaproveitar em vez de duplicar. */
export async function findReusablePayment(appointmentId: string): Promise<Payment | null> {
  return prisma.payment.findFirst({
    where: { appointmentId, status: { in: [...OPEN_PAYMENT_STATUSES] } },
    orderBy: { createdAt: "desc" },
  });
}

/** O valor pago pelo Mercado Pago bate com o cobrado? Valor ausente não vale como pago. */
export function isPaidAmountValid(paid: unknown, expected: number): boolean {
  return typeof paid === "number" && Number.isFinite(paid) && Math.abs(paid - expected) < 0.01;
}
