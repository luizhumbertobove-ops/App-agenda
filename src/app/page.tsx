export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { Calendar, DollarSign, Users, Clock, AlertCircle } from "lucide-react";
import { SyncButton } from "@/components/sync-button";
import { PaymentButton } from "@/components/payment-button";
import { startOfTodayBR, endOfTodayBR, formatLongDateBR, formatTimeBR } from "@/lib/date";
import { getSettings } from "@/lib/settings";
import { formatCurrencyBR } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { APPOINTMENT_STATUS } from "@/lib/status-labels";
import { EmptyState } from "@/components/empty-state";

async function getDashboardData() {
  const today = startOfTodayBR();
  const todayEnd = endOfTodayBR();

  const startOfMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const endOfMonth = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0, 23, 59, 59)
  );

  const [settings, [todayAppointments, pendingPayments, monthRevenue, totalClients]] = await Promise.all([
    getSettings(),
    Promise.all([
    prisma.appointment.findMany({
      where: { startTime: { gte: today, lte: todayEnd }, status: { not: "CANCELLED" } },
      include: { client: true },
      orderBy: { startTime: "asc" },
    }),
    prisma.payment.findMany({
      where: { status: { in: ["PENDING", "SENT"] } },
      include: { client: true, appointment: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.payment.aggregate({
      where: { status: "PAID", paidAt: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { amount: true },
    }),
      prisma.client.count(),
    ]),
  ]);

  return {
    todayAppointments,
    pendingPayments,
    monthRevenue: monthRevenue._sum.amount ?? 0,
    totalClients,
    monthlyGoal: settings.monthlyGoal ?? null,
  };
}

export default async function DashboardPage() {
  const { todayAppointments, pendingPayments, monthRevenue, totalClients, monthlyGoal } =
    await getDashboardData();

  const goalPct = monthlyGoal && monthlyGoal > 0
    ? Math.min(Math.round((monthRevenue / monthlyGoal) * 100), 100)
    : null;

  return (
    <div className="p-3 sm:p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Dashboard"
        subtitle={<span className="capitalize">{formatLongDateBR()}</span>}
        action={<SyncButton />}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<Calendar className="text-violet-600" size={20} />}
          label="Hoje"
          value={String(todayAppointments.length)}
          sub="atendimentos"
        />
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="text-green-600" size={20} />
            <span className="text-xs text-gray-500">Receita do mês</span>
          </div>
          <p className="text-base sm:text-xl font-bold text-gray-900">{formatCurrencyBR(monthRevenue)}</p>
          {goalPct !== null ? (
            <div className="mt-2">
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${goalPct >= 100 ? "bg-green-500" : "bg-violet-500"}`}
                  style={{ width: `${goalPct}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">{goalPct}% da meta</p>
            </div>
          ) : (
            <p className="text-xs text-gray-400">recebido</p>
          )}
        </div>
        <StatCard
          icon={<AlertCircle className="text-amber-600" size={20} />}
          label="Pagamentos"
          value={String(pendingPayments.length)}
          sub="pendentes"
        />
        <StatCard
          icon={<Users className="text-blue-600" size={20} />}
          label="Clientes"
          value={String(totalClients)}
          sub="cadastrados"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock size={16} className="text-violet-600" />
            Agenda de hoje
          </h3>
          {todayAppointments.length === 0 ? (
            <EmptyState title="Nenhum atendimento hoje." />
          ) : (
            <ul className="space-y-3">
              {todayAppointments.map((appt) => (
                <li key={appt.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 text-sm truncate">
                      {appt.client?.name ?? appt.title}
                    </p>
                    <p className="text-gray-400 text-xs">
                      {formatTimeBR(appt.startTime)} – {formatTimeBR(appt.endTime)}
                    </p>
                  </div>
                  <StatusBadge status={appt.status} map={APPOINTMENT_STATUS} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign size={16} className="text-amber-500" />
            Pagamentos pendentes
          </h3>
          {pendingPayments.length === 0 ? (
            <p className="text-gray-400 text-sm">Tudo em dia! 🎉</p>
          ) : (
            <ul className="space-y-3">
              {pendingPayments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 text-sm truncate">
                      {p.client?.name ?? <span className="text-gray-400 italic">Cliente excluído</span>}
                    </p>
                    <p className="text-gray-400 text-xs">{formatCurrencyBR(p.amount)}</p>
                  </div>
                  {p.appointmentId && p.client && p.status === "PENDING" && (
                    <PaymentButton
                      appointmentId={p.appointmentId}
                      amount={p.amount}
                      clientName={p.client.name}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400">{sub}</p>
    </div>
  );
}
