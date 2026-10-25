import type { AppointmentStatus, PaymentStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

// Apaga os dados de todas as tabelas do schema, mantendo o histórico de migrations.
export async function resetDb(): Promise<void> {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length === 0) return;
  const list = tables.map((t) => `"${t.tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
}

// Telefone é único: um contador garante um valor novo a cada chamada.
let phoneSeq = 0;

export function makeClient(data: Partial<{ name: string; phone: string }> = {}) {
  phoneSeq += 1;
  return prisma.client.create({
    data: {
      name: data.name ?? "Cliente Teste",
      phone: data.phone ?? `11900${String(phoneSeq).padStart(6, "0")}`,
    },
  });
}

export function makeAppointment(data: {
  start: Date;
  end: Date;
  status?: AppointmentStatus;
  clientId?: string | null;
}) {
  return prisma.appointment.create({
    data: {
      title: "Teste - Massagem",
      serviceType: "Massagem",
      startTime: data.start,
      endTime: data.end,
      status: data.status,
      clientId: data.clientId ?? null,
    },
  });
}

export function makePayment(data: {
  amount: number;
  appointmentId?: string;
  clientId?: string | null;
  status?: PaymentStatus;
  fromCompletion?: boolean;
  mpPaymentId?: string;
  paidAt?: Date;
}) {
  return prisma.payment.create({
    data: {
      amount: data.amount,
      appointmentId: data.appointmentId ?? null,
      clientId: data.clientId ?? null,
      status: data.status,
      fromCompletion: data.fromCompletion,
      mpPaymentId: data.mpPaymentId,
      paidAt: data.paidAt,
    },
  });
}

export function makeBlock(start: Date, end: Date) {
  return prisma.blockedSlot.create({ data: { startTime: start, endTime: end } });
}

export async function makePlanSubscription(clientId: string, sessions: number, sessionsUsed = 0) {
  const plan = await prisma.plan.create({
    data: { name: "Plano Teste", sessions, price: 0, validityDays: 0 },
  });
  return prisma.planSubscription.create({
    data: { clientId, planId: plan.id, sessionsUsed },
  });
}
