import { beforeEach, describe, expect, it, vi } from "vitest";
import { logManualMessage, sendAndLog } from "./messaging";
import { sendText } from "@/lib/evolution";
import { prisma } from "@/lib/prisma";
import { makeAppointment, makeClient, resetDb } from "@/test/db";

vi.mock("@/lib/evolution", () => ({ sendText: vi.fn() }));

const START = new Date("2026-10-20T13:00:00Z");
const END = new Date("2026-10-20T14:00:00Z");

beforeEach(async () => {
  await resetDb();
  vi.mocked(sendText).mockReset();
  vi.mocked(sendText).mockResolvedValue(undefined);
});

describe("sendAndLog", () => {
  it("envio ok grava histórico 'sent'", async () => {
    const client = await makeClient();

    await sendAndLog(client.phone, {
      clientId: client.id,
      type: "REENGAGEMENT",
      message: "Oi, tudo bem?",
    });

    expect(sendText).toHaveBeenCalledWith(client.phone, "Oi, tudo bem?");
    const logs = await prisma.whatsappLog.findMany({ where: { clientId: client.id } });
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ type: "REENGAGEMENT", message: "Oi, tudo bem?", status: "sent" });
  });

  it("envio que falha não grava nada e rejeita", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(sendText).mockRejectedValueOnce(new Error("offline"));
    const client = await makeClient();

    await expect(
      sendAndLog(client.phone, { clientId: client.id, type: "NO_SHOW", message: "Oi" })
    ).rejects.toThrow("offline");

    expect(await prisma.whatsappLog.count()).toBe(0);
    vi.mocked(console.error).mockRestore();
  });

  it("confirmação marca confirmationSentAt", async () => {
    const client = await makeClient();
    const appt = await makeAppointment({ start: START, end: END, clientId: client.id });

    await sendAndLog(client.phone, {
      clientId: client.id,
      type: "CONFIRMATION",
      message: "Confirmado",
      appointmentId: appt.id,
    });

    const updated = await prisma.appointment.findUniqueOrThrow({ where: { id: appt.id } });
    expect(updated.confirmationSentAt).toBeInstanceOf(Date);
    expect(await prisma.whatsappLog.count({ where: { status: "sent" } })).toBe(1);
  });
});

describe("logManualMessage", () => {
  it("logManualMessage grava 'manual' e marca confirmação", async () => {
    const client = await makeClient();
    const appt = await makeAppointment({ start: START, end: END, clientId: client.id });

    await logManualMessage({
      clientId: client.id,
      type: "CONFIRMATION",
      message: "Enviado pelo aparelho",
      appointmentId: appt.id,
    });

    expect(sendText).not.toHaveBeenCalled();
    const logs = await prisma.whatsappLog.findMany({ where: { clientId: client.id } });
    expect(logs).toHaveLength(1);
    expect(logs[0].status).toBe("manual");
    const updated = await prisma.appointment.findUniqueOrThrow({ where: { id: appt.id } });
    expect(updated.confirmationSentAt).toBeInstanceOf(Date);
  });
});
