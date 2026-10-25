export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Phone, Calendar, DollarSign, MessageSquare, ChevronLeft, CalendarPlus, QrCode } from "lucide-react";
import Link from "next/link";
import { EditClientForm } from "@/components/edit-client-form";
import { PaymentButton } from "@/components/payment-button";
import { DeleteClientButton } from "@/components/delete-client-button";
import { PaymentRowActions } from "@/components/payment-row-actions";
import { SendWhatsappModal } from "@/components/send-whatsapp-modal";
import { ClientTags } from "@/components/client-tags";
import { SellPlanModal } from "@/components/sell-plan-modal";
import { PlanMembersModal } from "@/components/plan-members-modal";
import { clientPlansWhere } from "@/lib/plan-access";
import { formatTimeBR, formatDateBR } from "@/lib/date";
import { formatCurrencyBR } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { APPOINTMENT_STATUS, PAYMENT_STATUS, MESSAGE_TYPE } from "@/lib/status-labels";
import { pageShell } from "@/components/page-shell";

/** Iniciais das duas primeiras palavras que começam com letra; ignora emoji. */
function iniciais(nome: string): string {
  const palavras = nome
    .trim()
    .split(/\s+/)
    .filter((p) => /^\p{L}/u.test(p))
    .slice(0, 2);
  if (palavras.length > 0) {
    return palavras.map((p) => (Array.from(p)[0] ?? "").toUpperCase()).join("");
  }
  return (Array.from(nome.trim())[0] ?? "?").toUpperCase();
}

export default async function ClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [client, stats, planos, clientesSeletor] = await Promise.all([
    prisma.client.findUnique({
      where: { id },
      include: {
        appointments: { orderBy: { startTime: "desc" } },
        payments: { where: { status: { not: "CANCELLED" } }, orderBy: { createdAt: "desc" } },
        whatsappLogs: { orderBy: { sentAt: "desc" }, take: 10 },
      },
    }),
    Promise.all([
      prisma.payment.aggregate({
        where: { clientId: id, status: "PAID" },
        _sum: { amount: true },
      }),
      prisma.appointment.count({ where: { clientId: id, status: "DONE" } }),
      prisma.appointment.count({ where: { clientId: id, status: "CANCELLED" } }),
    ]),
    // Pacotes do cliente: os que comprou (titular) e os de que é membro.
    prisma.planSubscription.findMany({
      where: clientPlansWhere(id),
      include: {
        plan: true,
        client: { select: { id: true, name: true } },
        members: { include: { client: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" } },
      },
      orderBy: { purchasedAt: "desc" },
    }),
    prisma.client.findMany({ select: { id: true, name: true, phone: true }, orderBy: { name: "asc" } }),
  ]);

  if (!client) notFound();

  const [lifetimeAgg, sessoesDone, sessoesCanceladas] = stats;
  const lifetimeValue = lifetimeAgg._sum.amount ?? 0;

  // Usos concluídos de cada pacote, numa consulta só.
  const idsPlanos = planos.map((p) => p.id);
  const usos = idsPlanos.length
    ? await prisma.appointment.findMany({
        where: { status: "DONE", planSubscriptionId: { in: idsPlanos } },
        select: { id: true, planSubscriptionId: true, startTime: true, client: { select: { name: true } } },
        orderBy: { startTime: "desc" },
      })
    : [];
  const usosPorPlano = new Map<string, { id: string; nome: string; data: Date }[]>();
  for (const u of usos) {
    if (!u.planSubscriptionId) continue;
    const lista = usosPorPlano.get(u.planSubscriptionId) ?? [];
    lista.push({ id: u.id, nome: u.client?.name ?? "Sem nome", data: u.startTime });
    usosPorPlano.set(u.planSubscriptionId, lista);
  }

  const pendingPayments = client.payments.filter((p) => p.status === "PENDING");
  const temTelefone = client.phone !== "00000000000";

  return (
    <div className={pageShell()}>
      <Link
        href="/clientes"
        className="-ml-2 mb-4 inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-sm text-gray-500 transition-colors hover:text-gray-800"
      >
        <ChevronLeft size={18} aria-hidden />
        Voltar
      </Link>

      {/* Topo: avatar, nome, telefone e etiquetas */}
      <header className="flex items-center gap-4">
        <div
          aria-hidden
          className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-violet-100 text-2xl font-semibold text-violet-700"
        >
          {iniciais(client.name)}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl leading-tight text-gray-900 break-words">{client.name}</h1>
          {temTelefone && (
            <p className="mt-1 flex items-center gap-1 text-sm text-gray-500">
              <Phone size={13} aria-hidden />
              {client.phone}
            </p>
          )}
          <div className="mt-2">
            <ClientTags clientId={client.id} initialTags={client.tags ?? []} />
          </div>
        </div>
      </header>

      {/* Ações principais em pílula */}
      <section aria-label="Ações do cliente" className="mt-6">
        <div className="grid grid-cols-3 gap-2">
          <SendWhatsappModal clientId={client.id} clientName={client.name} />
          <Link
            href="/agenda"
            className="flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-violet-600 px-2 text-sm font-medium text-white transition-colors hover:bg-violet-700"
          >
            <CalendarPlus size={16} aria-hidden />
            Agendar
          </Link>
          <Link
            href="/financeiro"
            className="flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-gray-200 bg-white px-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <QrCode size={16} aria-hidden />
            Cobrar
          </Link>
        </div>
        <div className="mt-2 flex justify-end">
          <EditClientForm client={client} />
        </div>
      </section>

      {/* Três números */}
      <section aria-label="Resumo do cliente" className="mt-6 grid grid-cols-3 gap-2 md:gap-3">
        <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-3 text-center md:p-4">
          <p className="truncate font-display text-lg leading-tight text-gray-900 tabular-nums sm:text-2xl">
            {formatCurrencyBR(lifetimeValue)}
          </p>
          <p className="mt-1 text-xs leading-tight text-gray-500">Total gasto</p>
        </div>
        <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-3 text-center md:p-4">
          <p className="font-display text-lg leading-tight text-gray-900 tabular-nums sm:text-2xl">{sessoesDone}</p>
          <p className="mt-1 text-xs leading-tight text-gray-500">Sessões</p>
        </div>
        <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-3 text-center md:p-4">
          <p className="font-display text-lg leading-tight text-gray-900 tabular-nums sm:text-2xl">{sessoesCanceladas}</p>
          <p className="mt-1 text-xs leading-tight text-gray-500">Faltas e cancelamentos</p>
        </div>
      </section>

      {/* Pacotes de sessões */}
      <section aria-label="Pacotes" className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-gray-900">Pacotes</h2>
          <SellPlanModal clientId={client.id} clientName={client.name} clients={clientesSeletor} />
        </div>
        {planos.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">Nenhum pacote. Use para sessões pagas de uma vez.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {planos.map((sub) => {
              const restantes = Math.max(0, sub.plan.sessions - sub.sessionsUsed);
              const ehTitular = sub.clientId === client.id;
              // Os outros que usam o pacote (a ficha atual não entra na linha).
              const outros = sub.members.filter((m) => m.clientId !== client.id);
              const usosDoPlano = usosPorPlano.get(sub.id) ?? [];
              return (
                <li key={sub.id} className="rounded-lg bg-gray-50 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-medium text-gray-900">{sub.plan.name}</span>
                      {sub.members.length > 0 && (
                        <span className="shrink-0 rounded-full bg-amber-50 px-2 text-xs font-medium text-amber-700">
                          Familiar
                        </span>
                      )}
                    </span>
                    <span className={`shrink-0 ${restantes > 0 ? "text-violet-700" : "text-gray-500"}`}>
                      {restantes > 0 ? `${restantes} de ${sub.plan.sessions} restantes` : "Concluído"}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200" aria-hidden>
                    <div
                      className="h-full rounded-full bg-violet-600"
                      style={{ width: `${Math.min(100, (sub.sessionsUsed / sub.plan.sessions) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-gray-500">
                    {formatCurrencyBR(sub.plan.price)} · comprado em {formatDateBR(sub.purchasedAt)}
                  </p>

                  {!ehTitular && (
                    <p className="mt-1.5 text-xs text-gray-500">
                      Titular:{" "}
                      <Link
                        href={`/clientes/${sub.client.id}`}
                        className="font-medium text-violet-700 hover:underline"
                      >
                        {sub.client.name}
                      </Link>
                    </p>
                  )}

                  {ehTitular && (
                    <div className="mt-2">
                      <PlanMembersModal
                        subscriptionId={sub.id}
                        ownerId={client.id}
                        members={sub.members.map((m) => ({ clientId: m.clientId, name: m.client.name }))}
                        clients={clientesSeletor}
                      />
                    </div>
                  )}

                  {outros.length > 0 && (
                    <p className="mt-1.5 text-xs text-gray-500">
                      Também usam: {outros.map((m) => m.client.name).join(", ")}
                    </p>
                  )}

                  {usosDoPlano.length > 0 && (
                    <details className="mt-1.5 text-xs">
                      <summary className="flex min-h-11 cursor-pointer items-center text-violet-700">
                        Usos ({usosDoPlano.length})
                      </summary>
                      <ul className="space-y-1 pb-1 text-gray-600">
                        {usosDoPlano.map((u) => (
                          <li key={u.id} className="min-w-0 truncate">
                            {u.nome} · {formatDateBR(u.data)}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Observações do cliente */}
      {client.notes && (
        <section aria-label="Observações" className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-amber-700">Observações</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-gray-800">{client.notes}</p>
        </section>
      )}

      <div className="mt-6 grid gap-4 @4xl:grid-cols-2">
        {/* Histórico de atendimentos */}
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
            <Calendar size={16} className="text-violet-600" aria-hidden />
            Atendimentos
          </h2>
          {client.appointments.length === 0 ? (
            <EmptyState title="Nenhum atendimento ainda." />
          ) : (
            <ul className="space-y-3">
              {client.appointments.slice(0, 8).map((appt) => (
                <li key={appt.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <span className="text-gray-800">
                      {formatDateBR(appt.startTime)} às {formatTimeBR(appt.startTime)}
                    </span>
                    <p className="text-xs text-gray-500">{appt.serviceType}</p>
                  </div>
                  <StatusBadge status={appt.status} map={APPOINTMENT_STATUS} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Pagamentos */}
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
            <DollarSign size={16} className="text-amber-600" aria-hidden />
            Pagamentos
          </h2>
          {client.payments.length === 0 ? (
            <EmptyState title="Nenhum pagamento ainda." />
          ) : (
            <ul className="space-y-3">
              {client.payments.slice(0, 8).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <span className="text-gray-800">{formatCurrencyBR(p.amount)}</span>
                    <span className="ml-2 text-xs text-gray-500">
                      {formatDateBR(p.createdAt)}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge status={p.status} map={PAYMENT_STATUS} />
                    <PaymentRowActions paymentId={p.id} status={p.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          {pendingPayments.length > 0 && pendingPayments[0].appointmentId && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <PaymentButton
                appointmentId={pendingPayments[0].appointmentId}
                amount={pendingPayments[0].amount}
                clientName={client.name}
              />
            </div>
          )}
        </section>

        {/* Mensagens enviadas */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 @4xl:col-span-2">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
            <MessageSquare size={16} className="text-green-600" aria-hidden />
            Mensagens WhatsApp
          </h2>
          {client.whatsappLogs.length === 0 ? (
            <EmptyState title="Nenhuma mensagem enviada ainda." />
          ) : (
            <ul className="space-y-3">
              {client.whatsappLogs.map((log) => (
                <li key={log.id} className="border-l-2 border-green-200 pl-3 text-sm">
                  <div className="mb-1 flex items-center gap-2">
                    <StatusBadge status={log.type} map={MESSAGE_TYPE} />
                    <span className="text-xs text-gray-500">
                      {formatDateBR(log.sentAt)} {formatTimeBR(log.sentAt)}
                    </span>
                  </div>
                  <p className="whitespace-pre-line text-xs text-gray-600">{log.message}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Zona de exclusão: separada e discreta */}
      <section aria-label="Excluir cliente" className="mt-12 border-t border-gray-200 pt-6">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-gray-500">Excluir cliente</h2>
        <DeleteClientButton clientId={client.id} />
      </section>
    </div>
  );
}
