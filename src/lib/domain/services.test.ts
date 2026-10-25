import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "@/test/db";
import { renameServiceInFutureAppointments } from "./services";

const NOW = new Date("2030-01-10T12:00:00Z");
const FUTURE = new Date("2030-01-20T13:00:00Z");
const PAST = new Date("2029-12-20T13:00:00Z");

beforeEach(resetDb);

function makeAppt(data: {
  title: string;
  serviceType?: string;
  start?: Date;
  status?: "SCHEDULED" | "CONFIRMED" | "DONE" | "CANCELLED";
}) {
  const start = data.start ?? FUTURE;
  return prisma.appointment.create({
    data: {
      title: data.title,
      serviceType: data.serviceType ?? "Massagem",
      startTime: start,
      endTime: new Date(start.getTime() + 60 * 60_000),
      status: data.status,
      googleEventId: `g-${data.title}-${start.getTime()}`,
    },
  });
}

function rename(oldName: string, newName: string) {
  return prisma.$transaction((tx) =>
    renameServiceInFutureAppointments(tx, oldName, newName, NOW),
  );
}

describe("renameServiceInFutureAppointments", () => {
  it("atendimento futuro muda serviço e sufixo do título", async () => {
    const appt = await makeAppt({ title: "Ana - Massagem" });

    const changed = await rename("Massagem", "Massagem tântrica");

    expect(changed).toEqual([
      {
        id: appt.id,
        googleEventId: appt.googleEventId,
        title: "Ana - Massagem tântrica",
        startTime: appt.startTime,
        endTime: appt.endTime,
      },
    ]);
    const after = await prisma.appointment.findUniqueOrThrow({ where: { id: appt.id } });
    expect(after.serviceType).toBe("Massagem tântrica");
    expect(after.title).toBe("Ana - Massagem tântrica");
  });

  it("atendimento passado não muda", async () => {
    const appt = await makeAppt({ title: "Ana - Massagem", start: PAST });

    const changed = await rename("Massagem", "Massagem tântrica");

    expect(changed).toEqual([]);
    const after = await prisma.appointment.findUniqueOrThrow({ where: { id: appt.id } });
    expect(after.serviceType).toBe("Massagem");
    expect(after.title).toBe("Ana - Massagem");
  });

  it("atendimento cancelado não muda", async () => {
    const appt = await makeAppt({ title: "Ana - Massagem", status: "CANCELLED" });

    const changed = await rename("Massagem", "Massagem tântrica");

    expect(changed).toEqual([]);
    const after = await prisma.appointment.findUniqueOrThrow({ where: { id: appt.id } });
    expect(after.serviceType).toBe("Massagem");
    expect(after.title).toBe("Ana - Massagem");
  });

  it("atendimento de outro serviço não muda", async () => {
    const appt = await makeAppt({ title: "Ana - Drenagem", serviceType: "Drenagem" });

    const changed = await rename("Massagem", "Massagem tântrica");

    expect(changed).toEqual([]);
    const after = await prisma.appointment.findUniqueOrThrow({ where: { id: appt.id } });
    expect(after.serviceType).toBe("Drenagem");
    expect(after.title).toBe("Ana - Drenagem");
  });

  it("título sem o sufixo exato mantém o título e muda só o serviço", async () => {
    // "Massagem relaxante" não termina com " - Massagem": o título fica como está.
    const appt = await makeAppt({ title: "Ana - Massagem relaxante" });

    const changed = await rename("Massagem", "Massagem tântrica");

    expect(changed).toHaveLength(1);
    const after = await prisma.appointment.findUniqueOrThrow({ where: { id: appt.id } });
    expect(after.serviceType).toBe("Massagem tântrica");
    expect(after.title).toBe("Ana - Massagem relaxante");
  });

  it("não troca o nome antigo quando ele aparece no meio do título", async () => {
    // Título "Ana - Massagem relaxante" com serviço "Massagem" não pode virar "Ana - Massagem tântrica relaxante".
    await makeAppt({ title: "Ana - Massagem relaxante" });

    await rename("Massagem", "Massagem tântrica");

    const after = await prisma.appointment.findFirstOrThrow();
    expect(after.title).not.toBe("Ana - Massagem tântrica relaxante");
    expect(after.title).toBe("Ana - Massagem relaxante");
  });
});
