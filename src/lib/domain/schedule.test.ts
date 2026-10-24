import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { makeAppointment, makeBlock, makeClient, resetDb } from "@/test/db";
import { findConflict, withScheduleLock } from "./schedule";

const at = (iso: string) => new Date(iso);

beforeEach(resetDb);

describe("findConflict", () => {
  it("acha atendimento sobreposto", async () => {
    const appt = await makeAppointment({
      start: at("2030-01-10T13:00:00Z"),
      end: at("2030-01-10T14:00:00Z"),
    });
    const conflict = await withScheduleLock((tx) =>
      findConflict(tx, { start: at("2030-01-10T13:30:00Z"), end: at("2030-01-10T14:30:00Z") }),
    );
    expect(conflict).toEqual({ kind: "appointment", startTime: appt.startTime });
  });

  it("ignora atendimento cancelado", async () => {
    await makeAppointment({
      start: at("2030-01-10T13:00:00Z"),
      end: at("2030-01-10T14:00:00Z"),
      status: "CANCELLED",
    });
    const conflict = await withScheduleLock((tx) =>
      findConflict(tx, { start: at("2030-01-10T13:00:00Z"), end: at("2030-01-10T14:00:00Z") }),
    );
    expect(conflict).toBeNull();
  });

  it("encostar não é conflito", async () => {
    await makeAppointment({
      start: at("2030-01-10T13:00:00Z"),
      end: at("2030-01-10T14:00:00Z"),
    });
    const conflict = await withScheduleLock((tx) =>
      findConflict(tx, { start: at("2030-01-10T14:00:00Z"), end: at("2030-01-10T15:00:00Z") }),
    );
    expect(conflict).toBeNull();
  });

  it("acha bloqueio", async () => {
    const block = await makeBlock(at("2030-01-10T17:00:00Z"), at("2030-01-10T19:00:00Z"));
    const conflict = await withScheduleLock((tx) =>
      findConflict(tx, { start: at("2030-01-10T18:00:00Z"), end: at("2030-01-10T19:00:00Z") }),
    );
    expect(conflict).toEqual({ kind: "blocked", startTime: block.startTime });
  });

  it("exclui o próprio atendimento", async () => {
    const appt = await makeAppointment({
      start: at("2030-01-10T13:00:00Z"),
      end: at("2030-01-10T14:00:00Z"),
    });
    const conflict = await withScheduleLock((tx) =>
      findConflict(
        tx,
        { start: at("2030-01-10T13:00:00Z"), end: at("2030-01-10T14:00:00Z") },
        { excludeAppointmentId: appt.id },
      ),
    );
    expect(conflict).toBeNull();
  });
});

describe("withScheduleLock", () => {
  it("trava serializa reservas simultâneas", async () => {
    const client = await makeClient();
    const range = { start: at("2030-01-10T13:00:00Z"), end: at("2030-01-10T14:00:00Z") };

    const book = () =>
      withScheduleLock(async (tx) => {
        const conflict = await findConflict(tx, range);
        if (conflict) return false;
        await tx.appointment.create({
          data: {
            title: "Teste - Massagem",
            serviceType: "Massagem",
            startTime: range.start,
            endTime: range.end,
            clientId: client.id,
          },
        });
        return true;
      });

    const results = await Promise.all([book(), book()]);

    expect(results.filter((r) => r === true)).toHaveLength(1);
    expect(await prisma.appointment.count()).toBe(1);
  });
});
