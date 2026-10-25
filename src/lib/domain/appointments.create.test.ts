import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { DomainError } from "./errors";
import { createAppointments, type CreateAppointmentInput } from "./appointments";
import { makeAppointment, makeBlock, makeClient, resetDb } from "@/test/db";

const DAY_MS = 24 * 60 * 60 * 1000;
const START = new Date("2030-01-10T13:00:00Z");
const END = new Date("2030-01-10T14:00:00Z");

function input(overrides: Partial<CreateAppointmentInput> = {}): CreateAppointmentInput {
  return {
    clientId: null,
    isPartner: false,
    serviceType: "Massagem",
    start: START,
    end: END,
    ...overrides,
  };
}

beforeEach(resetDb);

describe("createAppointments", () => {
  it("cria 4 semanas com o mesmo recurrenceId", async () => {
    const client = await makeClient();
    const created = await createAppointments(input({ clientId: client.id, repeatWeeks: 4 }));

    expect(created).toHaveLength(4);
    const recurrenceId = created[0].recurrenceId;
    expect(recurrenceId).toBeTruthy();
    for (let i = 0; i < created.length; i++) {
      expect(created[i].recurrenceId).toBe(recurrenceId);
      expect(created[i].startTime.getTime()).toBe(START.getTime() + i * 7 * DAY_MS);
      expect(created[i].endTime.getTime()).toBe(END.getTime() + i * 7 * DAY_MS);
    }
    expect(await prisma.appointment.count()).toBe(4);
  });

  it("conflito na 3ª semana não cria nenhuma", async () => {
    const client = await makeClient();
    await makeAppointment({
      start: new Date(START.getTime() + 14 * DAY_MS),
      end: new Date(END.getTime() + 14 * DAY_MS),
    });

    const err = await createAppointments(input({ clientId: client.id, repeatWeeks: 4 })).catch((e) => e);
    expect(err).toBeInstanceOf(DomainError);
    expect((err as DomainError).status).toBe(409);
    expect(await prisma.appointment.count()).toBe(1);
  });

  it("bloqueio conta como conflito", async () => {
    const client = await makeClient();
    await makeBlock(
      new Date(START.getTime() + 7 * DAY_MS),
      new Date(END.getTime() + 7 * DAY_MS),
    );

    const err = await createAppointments(input({ clientId: client.id, repeatWeeks: 3 })).catch((e) => e);
    expect(err).toBeInstanceOf(DomainError);
    expect((err as DomainError).status).toBe(409);
    expect((err as DomainError).message.startsWith("Horário bloqueado")).toBe(true);
    expect(await prisma.appointment.count()).toBe(0);
  });

  it("cobrança só na primeira ocorrência", async () => {
    const client = await makeClient();
    const created = await createAppointments(
      input({ clientId: client.id, repeatWeeks: 3, amount: 150 }),
    );

    const payments = await prisma.payment.findMany();
    expect(payments).toHaveLength(1);
    expect(payments[0].status).toBe("PENDING");
    expect(payments[0].amount).toBe(150);
    expect(payments[0].appointmentId).toBe(created[0].id);
  });

  it("cliente inexistente → 404", async () => {
    const err = await createAppointments(input({ clientId: "cliente-inexistente" })).catch((e) => e);
    expect(err).toBeInstanceOf(DomainError);
    expect((err as DomainError).status).toBe(404);
    expect(await prisma.appointment.count()).toBe(0);
  });

  it("fim antes do início → 400", async () => {
    const client = await makeClient();
    const err = await createAppointments(
      input({ clientId: client.id, start: END, end: START }),
    ).catch((e) => e);
    expect(err).toBeInstanceOf(DomainError);
    expect((err as DomainError).status).toBe(400);
  });

  it("parceria sem nome → 400", async () => {
    const err = await createAppointments(input({ isPartner: true })).catch((e) => e);
    expect(err).toBeInstanceOf(DomainError);
    expect((err as DomainError).status).toBe(400);
    expect(await prisma.appointment.count()).toBe(0);
  });

  it("52 semanas cabem na transação", async () => {
    const client = await makeClient();
    const created = await createAppointments(input({ clientId: client.id, repeatWeeks: 52 }));
    expect(created).toHaveLength(52);
    expect(await prisma.appointment.count()).toBe(52);
  }, 30_000);
});
