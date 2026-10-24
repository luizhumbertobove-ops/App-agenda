import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { updateAppointment } from "./appointments";
import {
  makeAppointment,
  makeClient,
  makePayment,
  makePlanSubscription,
  resetDb,
} from "@/test/db";

// Atendimento passado: "já recebi" registra o pagamento na data do atendimento.
const START = new Date("2025-01-10T13:00:00Z");
const END = new Date("2025-01-10T14:00:00Z");

beforeEach(resetDb);

describe("updateAppointment: concluir", () => {
  it("concluir com 'já recebi' cria Payment PAID com paidAt = startTime, fromCompletion true", async () => {
    const client = await makeClient();
    const appt = await makeAppointment({ start: START, end: END, clientId: client.id });

    const result = await updateAppointment(appt.id, {
      status: "DONE",
      charge: { amount: 120, paid: true },
    });

    expect(result.appointment.status).toBe("DONE");
    expect(result.cancelled).toBe(false);
    const payments = await prisma.payment.findMany({ where: { appointmentId: appt.id } });
    expect(payments).toHaveLength(1);
    expect(payments[0]).toMatchObject({
      status: "PAID",
      amount: 120,
      fromCompletion: true,
      clientId: client.id,
    });
    expect(payments[0].paidAt?.getTime()).toBe(START.getTime());
  });

  it("concluir reaproveita a cobrança em aberto e guarda o snapshot", async () => {
    const client = await makeClient();
    const appt = await makeAppointment({ start: START, end: END, clientId: client.id });
    await makePayment({ appointmentId: appt.id, clientId: client.id, amount: 100, status: "PENDING" });

    await updateAppointment(appt.id, { status: "DONE", charge: { amount: 120, paid: true } });

    const payments = await prisma.payment.findMany({ where: { appointmentId: appt.id } });
    expect(payments).toHaveLength(1);
    expect(payments[0]).toMatchObject({
      status: "PAID",
      amount: 120,
      preCompletionStatus: "PENDING",
      preCompletionAmount: 100,
    });
  });

  it("concluir sem cobrança cancela a cobrança em aberto", async () => {
    const client = await makeClient();
    const appt = await makeAppointment({ start: START, end: END, clientId: client.id });
    await makePayment({ appointmentId: appt.id, clientId: client.id, amount: 100, status: "PENDING" });

    await updateAppointment(appt.id, { status: "DONE" });

    const payments = await prisma.payment.findMany({ where: { appointmentId: appt.id } });
    expect(payments).toHaveLength(1);
    expect(payments[0]).toMatchObject({
      status: "CANCELLED",
      amount: 100,
      preCompletionStatus: "PENDING",
      preCompletionAmount: 100,
    });
  });

  it("pelo pacote sem saldo → 409 e status não muda", async () => {
    const client = await makeClient();
    const appt = await makeAppointment({ start: START, end: END, clientId: client.id });
    await makePlanSubscription(client.id, 2, 2); // pacote já esgotado

    await expect(
      updateAppointment(appt.id, { status: "DONE", usePlan: true }),
    ).rejects.toMatchObject({
      status: 409,
      message: "Este cliente não tem sessões sobrando no pacote.",
    });

    const after = await prisma.appointment.findUniqueOrThrow({ where: { id: appt.id } });
    expect(after.status).toBe("SCHEDULED");
  });

  it("pelo pacote usa o mais antigo com saldo; última sessão desativa o pacote", async () => {
    const client = await makeClient();
    const appt = await makeAppointment({ start: START, end: END, clientId: client.id });
    // Criado primeiro, mas comprado depois: o mais antigo é o que foi comprado antes.
    const newer = await makePlanSubscription(client.id, 2, 0);
    const older = await makePlanSubscription(client.id, 2, 1);
    await prisma.planSubscription.update({
      where: { id: newer.id },
      data: { purchasedAt: new Date("2024-06-01T00:00:00Z") },
    });
    await prisma.planSubscription.update({
      where: { id: older.id },
      data: { purchasedAt: new Date("2024-01-01T00:00:00Z") },
    });

    await updateAppointment(appt.id, { status: "DONE", usePlan: true });

    const olderAfter = await prisma.planSubscription.findUniqueOrThrow({ where: { id: older.id } });
    const newerAfter = await prisma.planSubscription.findUniqueOrThrow({ where: { id: newer.id } });
    expect(olderAfter).toMatchObject({ sessionsUsed: 2, active: false });
    expect(newerAfter).toMatchObject({ sessionsUsed: 0, active: true });

    const after = await prisma.appointment.findUniqueOrThrow({ where: { id: appt.id } });
    expect(after.planSubscriptionId).toBe(older.id);
  });

  it("concluir duas vezes ao mesmo tempo → um 409 e um só Payment", async () => {
    const client = await makeClient();
    const appt = await makeAppointment({ start: START, end: END, clientId: client.id });
    const input = { status: "DONE" as const, charge: { amount: 120, paid: true } };

    const results = await Promise.allSettled([
      updateAppointment(appt.id, input),
      updateAppointment(appt.id, input),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter(
      (r): r is PromiseRejectedResult => r.status === "rejected",
    );
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toMatchObject({
      status: 409,
      message: "Este atendimento já foi concluído.",
    });
    expect(await prisma.payment.count({ where: { appointmentId: appt.id } })).toBe(1);
  });
});

describe("updateAppointment: reabrir", () => {
  it("reabrir apaga o lançamento do Concluir, restaura a cobrança e devolve a sessão", async () => {
    const client = await makeClient();
    const appt = await makeAppointment({ start: START, end: END, clientId: client.id });
    await updateAppointment(appt.id, { status: "DONE", charge: { amount: 120, paid: true } });

    const result = await updateAppointment(appt.id, { status: "SCHEDULED" });

    expect(result.appointment.status).toBe("SCHEDULED");
    expect(result.keptPayments).toBe(0);
    expect(await prisma.payment.count({ where: { appointmentId: appt.id } })).toBe(0);
  });

  it("reabrir restaura a cobrança em aberto e devolve a sessão do pacote", async () => {
    const client = await makeClient();
    const appt = await makeAppointment({ start: START, end: END, clientId: client.id });
    const sub = await makePlanSubscription(client.id, 2, 0);
    await makePayment({ appointmentId: appt.id, clientId: client.id, amount: 100, status: "PENDING" });
    await updateAppointment(appt.id, { status: "DONE", usePlan: true });

    await updateAppointment(appt.id, { status: "SCHEDULED" });

    const payment = await prisma.payment.findFirstOrThrow({ where: { appointmentId: appt.id } });
    expect(payment).toMatchObject({
      status: "PENDING",
      amount: 100,
      paidAt: null,
      preCompletionStatus: null,
      preCompletionAmount: null,
    });
    const subAfter = await prisma.planSubscription.findUniqueOrThrow({ where: { id: sub.id } });
    expect(subAfter).toMatchObject({ sessionsUsed: 0, active: true });
    const after = await prisma.appointment.findUniqueOrThrow({ where: { id: appt.id } });
    expect(after.planSubscriptionId).toBeNull();
  });

  it("reabrir mantém pagamento PAID com mpPaymentId e conta em keptPayments", async () => {
    const client = await makeClient();
    const appt = await makeAppointment({ start: START, end: END, clientId: client.id });
    await updateAppointment(appt.id, { status: "DONE", charge: { amount: 120, paid: true } });
    const payment = await prisma.payment.findFirstOrThrow({ where: { appointmentId: appt.id } });
    await prisma.payment.update({ where: { id: payment.id }, data: { mpPaymentId: "123" } });

    const result = await updateAppointment(appt.id, { status: "SCHEDULED" });

    expect(result.keptPayments).toBe(1);
    const kept = await prisma.payment.findMany({ where: { appointmentId: appt.id } });
    expect(kept).toHaveLength(1);
    expect(kept[0]).toMatchObject({ id: payment.id, status: "PAID", mpPaymentId: "123" });
  });
});
