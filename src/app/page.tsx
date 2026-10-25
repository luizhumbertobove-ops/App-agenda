export const dynamic = "force-dynamic";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { SyncButton } from "@/components/sync-button";
import { PaymentButton } from "@/components/payment-button";
import { SellPlanModal } from "@/components/sell-plan-modal";
import { startOfTodayBR, endOfTodayBR, formatLongDateBR, formatTimeBR, nowBR, monthRangeBR } from "@/lib/date";
import { getSettings } from "@/lib/settings";
import { formatCurrencyBR } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import { APPOINTMENT_STATUS } from "@/lib/status-labels";
import { whatsappLink } from "@/lib/vitrine";
import { WhatsappStatus } from "@/components/whatsapp-status";
import { pageShell } from "@/components/page-shell";
import { hasWhatsapp, OPEN_PAYMENT_STATUSES } from "@/lib/domain/constants";
import { TZ_BR } from "@/lib/date";

async function getDashboardData() {
  const today = startOfTodayBR();
  const todayEnd = endOfTodayBR();

  // Mês em horário de Brasília (o mesmo do Financeiro, para os totais baterem).
  const { start: startOfMonth, end: endOfMonth } = monthRangeBR();

  const [settings, [todayAppointments, pendingPayments, monthRevenue, pendingAgg, clients]] = await Promise.all([
    getSettings(),
    Promise.all([
      prisma.appointment.findMany({
        where: { startTime: { gte: today, lte: todayEnd }, status: { not: "CANCELLED" } },
        include: { client: true },
        orderBy: { startTime: "asc" },
      }),
      prisma.payment.findMany({
        where: { status: { in: [...OPEN_PAYMENT_STATUSES] } },
        include: { client: true, appointment: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.payment.aggregate({
        where: { status: "PAID", paidAt: { gte: startOfMonth, lt: endOfMonth } },
        _sum: { amount: true },
      }),
      // A lista acima mostra só as 10 mais recentes; o total "A receber" precisa de todas.
      prisma.payment.aggregate({
        where: { status: { in: [...OPEN_PAYMENT_STATUSES] } },
        _sum: { amount: true },
        _count: true,
      }),
      // Para o atalho "Vender pacote": escolher o cliente sem sair da Início.
      prisma.client.findMany({ select: { id: true, name: true, phone: true }, orderBy: { name: "asc" } }),
    ]),
  ]);

  const nowMs = Date.now();
  const nextAppointment =
    todayAppointments.find(
      (a) =>
        a.startTime.getTime() >= nowMs && (a.status === "SCHEDULED" || a.status === "CONFIRMED")
    ) ?? null;

  const brHour = nowBR().getUTCHours();
  const greeting =
    brHour >= 5 && brHour < 12 ? "Bom dia" : brHour >= 12 && brHour < 18 ? "Boa tarde" : "Boa noite";

  const monthName = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    timeZone: TZ_BR,
  }).format(new Date());

  return {
    todayAppointments,
    pendingPayments,
    nextAppointment,
    greeting,
    monthName,
    monthRevenue: monthRevenue._sum.amount ?? 0,
    monthlyGoal: settings.monthlyGoal ?? null,
    pendingTotal: pendingAgg._sum.amount ?? 0,
    pendingCount: pendingAgg._count,
    clients,
  };
}

export default async function InicioPage() {
  const {
    todayAppointments,
    pendingPayments,
    nextAppointment,
    greeting,
    monthName,
    monthRevenue,
    monthlyGoal,
    pendingTotal,
    pendingCount,
    clients,
  } = await getDashboardData();

  const goalPct =
    monthlyGoal && monthlyGoal > 0
      ? Math.min(Math.round((monthRevenue / monthlyGoal) * 100), 100)
      : null;


  return (
    <div className={pageShell()}>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-amber-700 capitalize">
            {formatLongDateBR()}
          </p>
          <h1 className="font-display text-3xl text-gray-900">{greeting}, Beto.</h1>
        </div>
        <SyncButton />
      </header>

      {/* Some quando o WhatsApp está conectado. */}
      <div className="mt-6 empty:hidden">
        <WhatsappStatus compact />
      </div>

      {/* No PC, duas colunas que crescem cada uma por si (sem buracos quando um bloco falta):
          à esquerda o resumo do dia, à direita as listas. No celular é uma coluna só, na mesma ordem. */}
      <div className="mt-6 flex flex-col gap-6 @4xl:grid @4xl:grid-cols-2 @4xl:items-start">
        <div className="flex flex-col gap-6">
          {nextAppointment && (
            <section className="relative overflow-hidden rounded-2xl bg-violet-800 p-5 text-gray-50">
              <svg
                aria-hidden
                viewBox="0 0 180 90"
                width="180"
                height="90"
                stroke="currentColor"
                strokeWidth={1.5}
                fill="none"
                className="pointer-events-none absolute -right-5 bottom-0 text-amber-300 opacity-70"
              >
                {[30, 54, 78].map((r) => (
                  <path key={r} d={`M${90 - r} 90 A${r} ${r} 0 0 1 ${90 + r} 90`} />
                ))}
              </svg>

              <div className="relative flex flex-col gap-3">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-amber-200">
                  Próximo atendimento · {formatTimeBR(nextAppointment.startTime)}
                </p>
                <div>
                  <h2 className="font-display text-3xl leading-tight">
                    {nextAppointment.client?.name ?? nextAppointment.title}
                  </h2>
                  <p className="mt-1 text-gray-100/90">
                    {nextAppointment.serviceType} · {formatTimeBR(nextAppointment.startTime)}–
                    {formatTimeBR(nextAppointment.endTime)}
                  </p>
                </div>
                {nextAppointment.client && hasWhatsapp(nextAppointment.client.phone) && (
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={whatsappLink("", nextAppointment.client.phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-gray-800"
                    >
                      <MessageCircle size={16} strokeWidth={1.75} aria-hidden />
                      WhatsApp
                    </a>
                    <Link
                      href={`/clientes/${nextAppointment.client.id}`}
                      className="inline-flex min-h-11 items-center rounded-full border border-white/40 px-4 text-sm font-medium text-gray-50"
                    >
                      Ver ficha
                    </Link>
                  </div>
                )}
              </div>
            </section>
          )}

          {goalPct !== null && monthlyGoal && (
            <section className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-sm text-gray-500">Meta de {monthName}</h2>
                <span className="text-sm font-semibold text-amber-700">{goalPct}%</span>
              </div>
              <p className="mt-2 font-display text-2xl text-gray-900">
                {formatCurrencyBR(monthRevenue)}{" "}
                <span className="font-sans text-base text-gray-500">de {formatCurrencyBR(monthlyGoal)}</span>
              </p>
              <div
                role="progressbar"
                aria-label="Progresso da meta do mês"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={goalPct}
                className="mt-3 h-2 overflow-hidden rounded bg-violet-100"
              >
                <div className="h-full bg-amber-500" style={{ width: `${goalPct}%` }} />
              </div>
            </section>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-500">Hoje</p>
              <p className="mt-1 font-display text-3xl text-gray-900">{todayAppointments.length}</p>
              <p className="text-xs text-gray-500">atendimentos</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-500">A receber</p>
              <p className="mt-1 font-display text-2xl text-amber-700">{formatCurrencyBR(pendingTotal)}</p>
              <p className="text-xs text-gray-500">{pendingCount} {pendingCount === 1 ? "pendente" : "pendentes"}</p>
            </div>
          </div>

          <SellPlanModal clients={clients} block />
        </div>

        <div className="flex flex-col gap-6">
          <section>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[17px] font-semibold text-gray-900">Agenda de hoje</h2>
              <Link href="/agenda" className="text-sm text-violet-700">
                Ver agenda
              </Link>
            </div>
            {todayAppointments.length === 0 ? (
              <div className="mt-3 flex flex-col items-start gap-3 rounded-xl border border-gray-200 bg-white p-5">
                <p className="text-gray-500">Nenhum atendimento hoje.</p>
                <Link
                  href="/agenda"
                  className="inline-flex min-h-11 items-center rounded-full bg-violet-600 px-5 text-sm font-medium text-white"
                >
                  Agendar
                </Link>
              </div>
            ) : (
              <ul className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white">
                {todayAppointments.map((appt) => {
                  const content = (
                    <>
                      <span className="w-12 shrink-0 tabular-nums font-semibold text-gray-900">
                        {formatTimeBR(appt.startTime)}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-gray-900">{appt.client?.name ?? appt.title}</span>
                        <span className="truncate text-sm text-gray-500">{appt.serviceType}</span>
                      </span>
                      <StatusBadge status={appt.status} map={APPOINTMENT_STATUS} />
                    </>
                  );
                  const rowClass =
                    "flex min-h-16 items-center gap-3 border-b border-gray-200 px-4 py-3 last:border-b-0";
                  return (
                    <li key={appt.id}>
                      {appt.client ? (
                        <Link href={`/clientes/${appt.client.id}`} className={`${rowClass} hover:bg-gray-50`}>
                          {content}
                        </Link>
                      ) : (
                        <div className={rowClass}>{content}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[17px] font-semibold text-gray-900">Cobranças em aberto</h2>
              <Link href="/financeiro" className="text-sm text-violet-700">
                Financeiro
              </Link>
            </div>
            {pendingPayments.length === 0 ? (
              <div className="mt-3 rounded-xl bg-green-50 p-4 text-sm text-green-700">
                Tudo em dia. Nenhuma cobrança em aberto.
              </div>
            ) : (
              <ul className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white">
                {pendingPayments.map((p) => (
                  <li
                    key={p.id}
                    className="flex min-h-16 items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-gray-900">
                        {p.client?.name ??
                          (p.appointment ? (
                            p.appointment.title.split(" - ")[0].trim()
                          ) : (
                            <span className="text-gray-500 italic">Cliente excluído</span>
                          ))}
                      </p>
                      <p className="text-sm text-gray-500">{formatCurrencyBR(p.amount)}</p>
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
          </section>
        </div>
      </div>
    </div>
  );
}
