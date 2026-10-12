import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfTodayBR, endOfTodayBR } from "@/lib/date";

export async function GET() {
  const today = startOfTodayBR();
  const todayEnd = endOfTodayBR();

  const startOfMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const endOfMonth = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0, 23, 59, 59)
  );

  const [todayAppointments, pendingPayments, monthRevenue, totalClients] = await Promise.all([
    prisma.appointment.findMany({
      where: { startTime: { gte: today, lte: todayEnd }, status: { not: "CANCELLED" } },
      include: { client: true },
      orderBy: { startTime: "asc" },
    }),

    prisma.payment.findMany({
      where: { status: { in: ["PENDING", "SENT"] } },
      include: { client: true, appointment: true },
      orderBy: { createdAt: "desc" },
    }),

    prisma.payment.aggregate({
      where: { status: "PAID", paidAt: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { amount: true },
    }),

    prisma.client.count(),
  ]);

  return NextResponse.json({
    todayAppointments,
    pendingPayments,
    monthRevenue: monthRevenue._sum.amount ?? 0,
    totalClients,
  });
}
