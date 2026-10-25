import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatDateBR } from "@/lib/date";
import { dateKeyBR } from "@/lib/date";

export async function GET() {
  const payments = await prisma.payment.findMany({
    where: { status: { not: "CANCELLED" } },
    include: { client: true, appointment: true },
    orderBy: { createdAt: "desc" },
  });

  const rows = [
    ["Data", "Cliente", "Serviço", "Valor (R$)", "Status", "Pago em"].join(";"),
    ...payments.map((p) => {
      const status: Record<string, string> = {
        PENDING: "Pendente",
        SENT: "Enviado",
        PAID: "Pago",
        OVERDUE: "Vencido",
      };
      return [
        formatDateBR(p.createdAt),
        p.client?.name ?? "Cliente excluído",
        p.appointment?.serviceType ?? "-",
        p.amount.toFixed(2).replace(".", ","),
        status[p.status] ?? p.status,
        p.paidAt ? formatDateBR(p.paidAt) : "-",
      ].join(";");
    }),
  ].join("\n");

  const bom = "﻿"; // UTF-8 BOM for Excel
  return new NextResponse(bom + rows, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="financeiro-${dateKeyBR(new Date())}.csv"`,
    },
  });
}
