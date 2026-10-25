export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileDown } from "lucide-react";
import { nowBR, TZ_BR } from "@/lib/date";
import { NewChargeModal } from "@/components/new-charge-modal";
import { PaymentRowActions } from "@/components/payment-row-actions";
import { RevenueChart } from "@/components/revenue-chart";
import { StatusBadge } from "@/components/status-badge";
import { PAYMENT_STATUS } from "@/lib/status-labels";
import { EmptyState } from "@/components/empty-state";
import { formatCurrencyBR } from "@/lib/format";
import Link from "next/link";
import { pageShell } from "@/components/page-shell";
import { financeTotals, listPayments, monthlyRevenue } from "@/lib/domain/finance";

const FILTERS = [
  { key: "todas", label: "Todas", href: "/financeiro" },
  { key: "pendentes", label: "Pendentes", href: "/financeiro?status=pendentes" },
  { key: "pagas", label: "Pagas", href: "/financeiro?status=pagas" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; pagina?: string }>;
}) {
  const { status, pagina } = await searchParams;
  const filter: FilterKey =
    status === "pendentes" || status === "pagas" ? status : "todas";
  // Página inválida (0, negativa, texto) cai na primeira.
  const n = Number(pagina);
  const page = Number.isInteger(n) && n >= 1 ? n : 1;

  const today = nowBR();
  // Limites de mês em horário de Brasília (00:00 BRT = 03:00 UTC); fim exclusivo.
  const monthBR = (offset: number) => {
    const y = today.getUTCFullYear();
    const m = today.getUTCMonth() + offset;
    return {
      start: new Date(Date.UTC(y, m, 1, 3)),
      end: new Date(Date.UTC(y, m + 1, 1, 3)),
      label: format(new Date(Date.UTC(y, m, 15)), "MMM", { locale: ptBR }).replace(".", ""),
    };
  };
  // Últimos 6 meses para o gráfico; o último é o mês atual.
  const chartMonths = Array.from({ length: 6 }, (_, i) => monthBR(i - 5));

  const [result, totals, settings, revenue] = await Promise.all([
    listPayments(filter, page),
    financeTotals(),
    getSettings(),
    // Recebido por mês = pagas com data de pagamento no mês (não a data em que a cobrança foi criada).
    monthlyRevenue(chartMonths),
  ]);
  const payments = result.items;
  const hasMore = result.hasMore;
  const chartData = chartMonths.map((m, i) => ({ label: m.label, value: revenue[i] ?? 0 }));

  // Nome do pacote só para as cobranças desta página.
  const planIds = payments.map((p) => p.planSubscriptionId).filter((id): id is string => !!id);
  const planSubs = planIds.length
    ? await prisma.planSubscription.findMany({ where: { id: { in: planIds } }, include: { plan: true } })
    : [];
  const planName = new Map(planSubs.map((s) => [s.id, s.plan.name]));

  const totalPaid = revenue[revenue.length - 1] ?? 0;
  // A receber = tudo o que está em aberto (inclusive vencidas), de qualquer mês.
  const totalPending = totals.openSum;
  const pendingCount = totals.openCount;
  const totalForecast = totalPaid + totalPending;

  const goal = settings.monthlyGoal ?? 0;
  const goalPct = goal > 0 ? Math.min((totalPaid / goal) * 100, 100) : 0;
  const missing = Math.max(0, goal - totalPaid);

  // Data que importa: a do atendimento (quando houver); senão, a do lançamento.
  const refDate = (p: (typeof payments)[number]) => p.appointment?.startTime ?? p.createdAt;
  const diaMes = (d: Date) => {
    const parts = new Intl.DateTimeFormat("pt-BR", {
      day: "numeric",
      month: "short",
      timeZone: TZ_BR,
    }).formatToParts(d);
    const get = (t: string) => parts.find((x) => x.type === t)?.value ?? "";
    return `${get("day")} ${get("month").replace(".", "")}`;
  };
  const monthLabel = format(today, "MMMM yyyy", { locale: ptBR });
  // Links da paginação: a primeira página não leva "pagina" na URL.
  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (filter !== "todas") params.set("status", filter);
    if (p > 1) params.set("pagina", String(p));
    const qs = params.toString();
    return qs ? `/financeiro?${qs}` : "/financeiro";
  };

  return (
    <div className={pageShell()}>
      <header className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-amber-700">
            {monthLabel}
          </p>
          <h1 className="font-display text-3xl text-gray-900">Financeiro</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/api/financeiro/export"
            aria-label="Exportar planilha"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition-colors hover:bg-gray-50"
          >
            <FileDown size={18} aria-hidden />
          </Link>
          <NewChargeModal />
        </div>
      </header>

      <div className="flex flex-col gap-6 @4xl:grid @4xl:grid-cols-2 @4xl:items-start @4xl:gap-6">
        {/* Ao lado da lista longa de cobranças, o resumo acompanha a rolagem. */}
        <div className="flex flex-col gap-4 @4xl:sticky @4xl:top-8">
          <section className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100 p-5">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-amber-700">
              Recebido no mês
            </p>
            <p className="font-display text-4xl tabular-nums text-gray-900">
              {formatCurrencyBR(totalPaid)}
            </p>
            {goal > 0 && (
              <>
                <div
                  role="progressbar"
                  aria-label="Progresso da meta do mês"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(goalPct)}
                  className="h-2 overflow-hidden rounded bg-violet-100"
                >
                  <div className="h-full rounded bg-amber-500" style={{ width: `${goalPct}%` }} />
                </div>
                <p className="text-sm text-gray-700">
                  Meta {formatCurrencyBR(goal)} · faltam {formatCurrencyBR(missing)}
                </p>
              </>
            )}
          </section>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">A receber</p>
              <p className="mt-1 font-display text-xl tabular-nums text-amber-700 md:text-2xl">
                {formatCurrencyBR(totalPending)}
              </p>
              <p className="mt-1 text-xs text-gray-500">{pendingCount} pendentes</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">Previsto</p>
              <p className="mt-1 font-display text-xl tabular-nums text-gray-900 md:text-2xl">
                {formatCurrencyBR(totalForecast)}
              </p>
              <p className="mt-1 text-xs text-gray-500">recebido + a receber</p>
            </div>
          </div>

          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Últimos seis meses</h2>
            <RevenueChart data={chartData} />
          </section>
        </div>

        <section className="mt-6 flex flex-col gap-3 @4xl:mt-0">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl text-gray-900">Cobranças</h2>
          </div>

          <nav aria-label="Filtrar cobranças" className="flex gap-2 overflow-x-auto">
            {FILTERS.map((f) => {
              const active = f.key === filter;
              return (
                <Link
                  key={f.key}
                  href={f.href}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors ${
                    active
                      ? "bg-violet-600 text-white"
                      : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {f.label}
                  {f.key === "pendentes" && (
                    <span
                      className={`rounded-full px-2 text-xs ${
                        active ? "bg-white/20 text-white" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {pendingCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            {payments.length === 0 ? (
              <EmptyState
                title={
                  totals.allCount === 0
                    ? "Nenhum pagamento registrado ainda."
                    : "Nenhuma cobrança nesta lista."
                }
                padded
              />
            ) : (
              <ul className="divide-y divide-gray-100">
                {payments.map((p) => {
                  // Sem cadastro ligado (atendimento importado do Google), usa o nome do título do atendimento.
                  const name =
                    p.client?.name ?? (p.appointment ? p.appointment.title.split(" - ")[0].trim() : null);
                  const initial = name ? (Array.from(name)[0] ?? "?").toUpperCase() : "?";
                  const what =
                    p.appointment?.serviceType ??
                    (p.planSubscriptionId ? planName.get(p.planSubscriptionId) ?? "Pacote" : "Cobrança avulsa");
                  const when = diaMes(refDate(p));
                  return (
                    <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                      <span
                        aria-hidden
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-700"
                      >
                        {initial}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate text-[15px] font-medium ${
                            name ? "text-gray-900" : "italic text-gray-400"
                          }`}
                        >
                          {name ?? "Cliente excluído"}
                        </p>
                        <p className="truncate text-xs text-gray-500">
                          {what} · {when}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-[15px] font-semibold tabular-nums text-gray-900">
                          {formatCurrencyBR(p.amount)}
                        </span>
                        <div className="flex items-center gap-1">
                          {p.appointment?.isPartner && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                              Parceria
                            </span>
                          )}
                          <StatusBadge status={p.status} map={PAYMENT_STATUS} />
                        </div>
                        {p.status !== "PAID" && <PaymentRowActions paymentId={p.id} status={p.status} />}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {(hasMore || page > 1) && (
            <div className="flex flex-wrap justify-center gap-2">
              {page > 1 && (
                <Link
                  href={pageHref(1)}
                  className="inline-flex min-h-11 items-center rounded-full border border-gray-200 bg-white px-5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Voltar ao início
                </Link>
              )}
              {hasMore && (
                <Link
                  href={pageHref(page + 1)}
                  className="inline-flex min-h-11 items-center rounded-full border border-gray-200 bg-white px-5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Ver mais
                </Link>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
