import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export async function GET() {
  const payments = await prisma.payment.findMany({
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
        format(p.createdAt, "dd/MM/yyyy", { locale: ptBR }),
        p.client?.name ?? "Cliente excluído",
        p.appointment?.serviceType ?? "-",
        p.amount.toFixed(2).replace(".", ","),
        status[p.status] ?? p.status,
        p.paidAt ? format(p.paidAt, "dd/MM/yyyy", { locale: ptBR }) : "-",
      ].join(";");
    }),
  ].join("\n");

  const bom = "﻿"; // UTF-8 BOM for Excel
  return new NextResponse(bom + rows, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="financeiro-${format(new Date(), "yyyy-MM-dd")}.csv"`,
    },
  });
}
