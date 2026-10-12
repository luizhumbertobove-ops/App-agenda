export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DollarSign, TrendingUp, Clock, CheckCircle, BarChart2, Download } from "lucide-react";
import { nowBR } from "@/lib/date";
import { NewChargeModal } from "@/components/new-charge-modal";
import { PaymentRowActions } from "@/components/payment-row-actions";
import { RevenueChart } from "@/components/revenue-chart";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { PAYMENT_STATUS } from "@/lib/status-labels";
import { EmptyState } from "@/components/empty-state";
import { formatCurrencyBR } from "@/lib/format";
import Link from "next/link";

export default async function FinanceiroPage() {
  const today = nowBR();
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const monthEnd = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0, 23, 59, 59)
  );

  // Last 6 months for the chart
  const chartMonths = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(today, 5 - i);
    return {
      label: format(d, "MMM", { locale: ptBR }),
      start: startOfMonth(d),
      end: endOfMonth(d),
    };
  });

  const [payments, monthStats, clients, chartData] = await Promise.all([
    prisma.payment.findMany({
      include: { client: true, appointment: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.payment.groupBy({
      by: ["status"],
      where: { createdAt: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, phone: true } }),
    Promise.all(
      chartMonths.map(async (m) => {
        const agg = await prisma.payment.aggregate({
          where: { status: "PAID", paidAt: { gte: m.start, lte: m.end } },
          _sum: { amount: true },
        });
        return { label: m.label, value: agg._sum.amount ?? 0 };
      })
    ),
  ]);

  const paid = monthStats.find((s) => s.status === "PAID");
  const pendingGroups = monthStats.filter((s) => s.status === "PENDING" || s.status === "SENT");
  const totalPaid = paid?._sum.amount ?? 0;
  const totalPending = pendingGroups.reduce((sum, s) => sum + (s._sum.amount ?? 0), 0);
  const pendingCount = pendingGroups.reduce((sum, s) => sum + s._count, 0);

  return (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto">
      <PageHeader
        title="Financeiro"
        subtitle={<span className="capitalize">{format(today, "MMMM yyyy", { locale: ptBR })}</span>}
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/api/financeiro/export"
              className="flex items-center gap-2 border border-gray-200 text-gray-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Exportar CSV</span>
            </Link>
            <NewChargeModal clients={clients} />
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={16} className="text-green-600" />
            <span className="text-xs text-gray-500">Recebido no mês</span>
          </div>
          <p className="text-base sm:text-xl font-bold text-gray-900">{formatCurrencyBR(totalPaid)}</p>
          <p className="text-xs text-gray-400">{paid?._count ?? 0} pagamentos</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} className="text-amber-500" />
            <span className="text-xs text-gray-500">A receber</span>
          </div>
          <p className="text-base sm:text-xl font-bold text-gray-900">{formatCurrencyBR(totalPending)}</p>
          <p className="text-xs text-gray-400">{pendingCount} pendentes</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-violet-600" />
            <span className="text-xs text-gray-500">Total previsto</span>
          </div>
          <p className="text-base sm:text-xl font-bold text-gray-900">{formatCurrencyBR(totalPaid + totalPending)}</p>
          <p className="text-xs text-gray-400">recebido + pendente</p>
        </div>
      </div>

      {/* Revenue chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <BarChart2 size={16} className="text-violet-600" />
          Receita dos últimos 6 meses
        </h3>
        <RevenueChart data={chartData} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <DollarSign size={16} className="text-gray-400" />
            Todos os pagamentos
          </h3>
        </div>
        {payments.length === 0 ? (
          <EmptyState title="Nenhum pagamento registrado ainda." padded />
        ) : (
          <div className="divide-y divide-gray-50">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3 gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {p.client?.name ?? <span className="text-gray-400 italic">Cliente excluído</span>}
                  </p>
                  <p className="text-xs text-gray-400">
                    {format(p.createdAt, "dd/MM/yyyy", { locale: ptBR })}
                    {p.appointment && (
                      <> · {format(p.appointment.startTime, "HH:mm")}</>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-900">{formatCurrencyBR(p.amount)}</span>
                  <StatusBadge status={p.status} map={PAYMENT_STATUS} />
                  <PaymentRowActions paymentId={p.id} status={p.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
