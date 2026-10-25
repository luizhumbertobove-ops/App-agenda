import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { makeAppointment, makeClient, makePayment, resetDb } from "@/test/db";
import { FINANCE_PAGE_SIZE, financeTotals, listPayments, monthlyRevenue } from "./finance";

beforeEach(resetDb);

// Data de lançamento fixa, para a ordem não depender do relógio.
async function setCreatedAt(id: string, createdAt: Date) {
  await prisma.payment.update({ where: { id }, data: { createdAt } });
}

// Mês em horário de Brasília: 00:00 BRT = 03:00 UTC; fim exclusivo.
function brMonth(year: number, monthIndex: number) {
  return {
    start: new Date(Date.UTC(year, monthIndex, 1, 3)),
    end: new Date(Date.UTC(year, monthIndex + 1, 1, 3)),
  };
}

describe("listPayments", () => {
  it("ordena pela data do atendimento, mesmo quando a cobrança foi criada depois", async () => {
    const apptOld = await makeAppointment({
      start: new Date("2026-10-05T13:00:00Z"),
      end: new Date("2026-10-05T14:00:00Z"),
    });
    const apptNew = await makeAppointment({
      start: new Date("2026-10-20T13:00:00Z"),
      end: new Date("2026-10-20T14:00:00Z"),
    });
    const aOld = await makePayment({ amount: 1, appointmentId: apptOld.id });
    const avulsa = await makePayment({ amount: 2 });
    const aNew = await makePayment({ amount: 3, appointmentId: apptNew.id });
    await setCreatedAt(aOld.id, new Date("2026-10-25T10:00:00Z"));
    await setCreatedAt(avulsa.id, new Date("2026-10-10T10:00:00Z"));
    await setCreatedAt(aNew.id, new Date("2026-10-01T10:00:00Z"));

    const { items } = await listPayments("todas", 1);

    expect(items.map((p) => p.id)).toEqual([aNew.id, avulsa.id, aOld.id]);
  });

  it("devolve cliente e atendimento ligados a cada lançamento", async () => {
    const client = await makeClient({ name: "Ana" });
    const appt = await makeAppointment({
      start: new Date("2026-10-20T13:00:00Z"),
      end: new Date("2026-10-20T14:00:00Z"),
      clientId: client.id,
    });
    await makePayment({ amount: 150, appointmentId: appt.id, clientId: client.id });

    const { items } = await listPayments("todas", 1);

    expect(items[0].client?.name).toBe("Ana");
    expect(items[0].appointment?.id).toBe(appt.id);
  });

  it("pagina de 50 em 50 e indica a próxima página", async () => {
    await prisma.payment.createMany({
      data: Array.from({ length: FINANCE_PAGE_SIZE + 1 }, (_, i) => ({ amount: i + 1, status: "PENDING" as const })),
    });

    const first = await listPayments("todas", 1);
    const second = await listPayments("todas", 2);

    expect(first.items).toHaveLength(50);
    expect(first.hasMore).toBe(true);
    expect(second.items).toHaveLength(1);
    expect(second.hasMore).toBe(false);
  });

  it("não repete nem pula item quando várias cobranças têm a mesma data", async () => {
    const same = new Date("2026-10-20T10:00:00Z");
    await prisma.payment.createMany({
      data: Array.from({ length: FINANCE_PAGE_SIZE + 1 }, (_, i) => ({
        amount: i + 1,
        status: "PENDING" as const,
        createdAt: same,
      })),
    });

    const first = await listPayments("todas", 1);
    const second = await listPayments("todas", 2);
    const ids = [...first.items, ...second.items].map((p) => p.id);

    expect(new Set(ids).size).toBe(FINANCE_PAGE_SIZE + 1);
  });

  it("aplica o filtro antes de paginar", async () => {
    await prisma.payment.createMany({
      data: Array.from({ length: FINANCE_PAGE_SIZE + 1 }, (_, i) => ({ amount: i + 1, status: "PENDING" as const })),
    });
    await prisma.payment.createMany({
      data: Array.from({ length: 5 }, () => ({ amount: 9, status: "PAID" as const, paidAt: new Date() })),
    });

    const page2 = await listPayments("pendentes", 2);
    const pagas = await listPayments("pagas", 1);

    expect(page2.items).toHaveLength(1);
    expect(page2.hasMore).toBe(false);
    expect(pagas.items).toHaveLength(5);
    expect(pagas.items.every((p) => p.status === "PAID")).toBe(true);
  });

  it("deixa canceladas fora de todos os filtros", async () => {
    await makePayment({ amount: 10, status: "CANCELLED" });
    await makePayment({ amount: 20, status: "PENDING" });

    expect((await listPayments("todas", 1)).items).toHaveLength(1);
    expect((await listPayments("pendentes", 1)).items).toHaveLength(1);
    expect((await listPayments("pagas", 1)).items).toHaveLength(0);
  });
});

describe("financeTotals", () => {
  it("soma e conta o em aberto, e conta as não canceladas e as pagas", async () => {
    await makePayment({ amount: 100, status: "PENDING" });
    await makePayment({ amount: 50, status: "SENT" });
    await makePayment({ amount: 25, status: "OVERDUE" });
    await makePayment({ amount: 200, status: "PAID", paidAt: new Date() });
    await makePayment({ amount: 999, status: "CANCELLED" });

    const totals = await financeTotals();

    expect(totals).toEqual({ openSum: 175, openCount: 3, allCount: 4, paidCount: 1 });
  });

  it("zera tudo sem cobranças", async () => {
    expect(await financeTotals()).toEqual({ openSum: 0, openCount: 0, allCount: 0, paidCount: 0 });
  });
});

describe("monthlyRevenue", () => {
  it("separa a virada do mês pelo horário de Brasília", async () => {
    // 31/10 23:30 BRT = 01/11 02:30 UTC: ainda é outubro.
    await makePayment({ amount: 20, status: "PAID", paidAt: new Date("2026-11-01T02:30:00Z") });
    // 01/11 01:00 BRT = 01/11 04:00 UTC: já é novembro.
    await makePayment({ amount: 10, status: "PAID", paidAt: new Date("2026-11-01T04:00:00Z") });
    // 01/11 00:00 BRT exato entra em novembro (fim exclusivo de outubro).
    await makePayment({ amount: 1, status: "PAID", paidAt: new Date("2026-11-01T03:00:00Z") });
    await makePayment({ amount: 5, status: "PAID", paidAt: new Date("2026-10-15T15:00:00Z") });

    const result = await monthlyRevenue([brMonth(2026, 9), brMonth(2026, 10)]);

    expect(result).toEqual([25, 11]);
  });

  it("ignora cobranças que não estão pagas, mesmo com paidAt", async () => {
    await makePayment({ amount: 30, status: "PENDING", paidAt: new Date("2026-10-15T15:00:00Z") });
    await makePayment({ amount: 40, status: "CANCELLED", paidAt: new Date("2026-10-15T15:00:00Z") });

    expect(await monthlyRevenue([brMonth(2026, 9)])).toEqual([0]);
  });

  it("devolve um valor por mês pedido, na mesma ordem", async () => {
    await makePayment({ amount: 7, status: "PAID", paidAt: new Date("2026-09-10T15:00:00Z") });

    const result = await monthlyRevenue([brMonth(2026, 9), brMonth(2026, 8)]);

    expect(result).toEqual([0, 7]);
  });
});
