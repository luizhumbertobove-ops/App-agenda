import { Prisma, type Appointment, type Client, type Payment } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { OPEN_PAYMENT_STATUSES } from "./constants";

export type FinanceFilter = "todas" | "pendentes" | "pagas";
export const FINANCE_PAGE_SIZE = 50;

// Status em aberto ("A receber") como lista SQL; canceladas ficam fora de tudo.
const OPEN_LIST = Prisma.join([...OPEN_PAYMENT_STATUSES]);

/**
 * Página da lista, na ordem da tela; hasMore indica se há próxima página.
 * A ordem é a data do atendimento (ou do lançamento, sem atendimento), com id como desempate
 * para que itens com a mesma data não se repitam nem se percam entre páginas.
 */
export async function listPayments(
  filter: FinanceFilter,
  page: number
): Promise<{ items: (Payment & { client: Client | null; appointment: Appointment | null })[]; hasMore: boolean }> {
  const offset = (page - 1) * FINANCE_PAGE_SIZE;
  const condition =
    filter === "pendentes"
      ? Prisma.sql`p.status::text IN (${OPEN_LIST})`
      : filter === "pagas"
        ? Prisma.sql`p.status::text = 'PAID'`
        : Prisma.sql`p.status::text <> 'CANCELLED'`;

  // Busca uma a mais para saber se existe próxima página.
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT p.id
    FROM "Payment" p
    LEFT JOIN "Appointment" a ON a.id = p."appointmentId"
    WHERE ${condition}
    ORDER BY COALESCE(a."startTime", p."createdAt") DESC, p."createdAt" DESC, p.id DESC
    LIMIT ${FINANCE_PAGE_SIZE + 1} OFFSET ${offset}`;

  const hasMore = rows.length > FINANCE_PAGE_SIZE;
  const ids = rows.slice(0, FINANCE_PAGE_SIZE).map((r) => r.id);
  // findMany não garante a ordem dos ids, então reordena pelo resultado da consulta.
  const found = ids.length
    ? await prisma.payment.findMany({
        where: { id: { in: ids } },
        include: { client: true, appointment: true },
      })
    : [];
  const byId = new Map(found.map((p) => [p.id, p]));
  const items = ids.flatMap((id) => {
    const payment = byId.get(id);
    return payment ? [payment] : [];
  });
  return { items, hasMore };
}

/** Totais: em aberto (soma e quantidade) e quantidade por filtro, numa consulta só. */
export async function financeTotals(): Promise<{
  openSum: number;
  openCount: number;
  allCount: number;
  paidCount: number;
}> {
  const [row] = await prisma.$queryRaw<
    { openSum: number; openCount: number; allCount: number; paidCount: number }[]
  >`
    SELECT
      COALESCE(SUM(p.amount) FILTER (WHERE p.status::text IN (${OPEN_LIST})), 0) AS "openSum",
      COUNT(*) FILTER (WHERE p.status::text IN (${OPEN_LIST}))::int AS "openCount",
      COUNT(*) FILTER (WHERE p.status::text <> 'CANCELLED')::int AS "allCount",
      COUNT(*) FILTER (WHERE p.status::text = 'PAID')::int AS "paidCount"
    FROM "Payment" p`;
  // Number(): se a coluna virar Decimal, a soma não pode voltar como texto e concatenar na tela.
  return {
    openSum: Number(row.openSum),
    openCount: Number(row.openCount),
    allCount: Number(row.allCount),
    paidCount: Number(row.paidCount),
  };
}

/**
 * Recebido por mês (paidAt nas faixas pedidas, que são de horário de Brasília), numa consulta só.
 * Devolve um valor por faixa, na mesma ordem.
 */
export async function monthlyRevenue(months: { start: Date; end: Date }[]): Promise<number[]> {
  if (months.length === 0) return [];
  // Uma coluna por mês (alias m0, m1, ...) para não colidir nomes no resultado.
  const columns = months.map(
    (m, i) =>
      Prisma.sql`COALESCE(SUM(CASE WHEN p."paidAt" >= ${m.start} AND p."paidAt" < ${m.end} THEN p.amount END), 0) AS ${Prisma.raw(`"m${i}"`)}`
  );
  const from = new Date(Math.min(...months.map((m) => m.start.getTime())));
  const to = new Date(Math.max(...months.map((m) => m.end.getTime())));

  const [row] = await prisma.$queryRaw<Record<string, number>[]>`
    SELECT ${Prisma.join(columns, ", ")}
    FROM "Payment" p
    WHERE p.status::text = 'PAID' AND p."paidAt" >= ${from} AND p."paidAt" < ${to}`;
  return months.map((_, i) => Number(row[`m${i}`]));
}
