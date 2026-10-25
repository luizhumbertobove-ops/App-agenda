import { beforeEach, describe, expect, it } from "vitest";
import { findReusablePayment, isPaidAmountValid } from "./payments";
import { makeAppointment, makePayment, resetDb } from "@/test/db";

const START = new Date("2026-10-20T13:00:00Z");
const END = new Date("2026-10-20T14:00:00Z");

beforeEach(resetDb);

describe("findReusablePayment", () => {
  it("reaproveita cobrança OVERDUE", async () => {
    const appt = await makeAppointment({ start: START, end: END });
    const overdue = await makePayment({
      amount: 150,
      appointmentId: appt.id,
      status: "OVERDUE",
    });

    const found = await findReusablePayment(appt.id);

    expect(found?.id).toBe(overdue.id);
  });

  it("ignora PAID e CANCELLED", async () => {
    const appt = await makeAppointment({ start: START, end: END });
    await makePayment({ amount: 150, appointmentId: appt.id, status: "PAID" });
    await makePayment({ amount: 150, appointmentId: appt.id, status: "CANCELLED" });

    expect(await findReusablePayment(appt.id)).toBeNull();
  });

  it("pega a mais recente em aberto", async () => {
    const appt = await makeAppointment({ start: START, end: END });
    await makePayment({ amount: 100, appointmentId: appt.id, status: "PENDING" });
    const recent = await makePayment({ amount: 150, appointmentId: appt.id, status: "SENT" });

    const found = await findReusablePayment(appt.id);

    expect(found?.id).toBe(recent.id);
  });
});

describe("isPaidAmountValid", () => {
  it("valor ausente não vale como pago", () => {
    expect(isPaidAmountValid(undefined, 150)).toBe(false);
  });

  it("NaN e string não valem como pago", () => {
    expect(isPaidAmountValid(Number.NaN, 150)).toBe(false);
    expect(isPaidAmountValid("150", 150)).toBe(false);
  });

  it("valor igual vale", () => {
    expect(isPaidAmountValid(150, 150)).toBe(true);
  });

  it("valor diferente não vale", () => {
    expect(isPaidAmountValid(149, 150)).toBe(false);
  });
});
