export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Phone, Calendar, DollarSign, MessageSquare, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { EditClientForm } from "@/components/edit-client-form";
import { PaymentButton } from "@/components/payment-button";
import { DeleteClientButton } from "@/components/delete-client-button";
import { PaymentRowActions } from "@/components/payment-row-actions";
import { SendWhatsappModal } from "@/components/send-whatsapp-modal";
import { ClientTags } from "@/components/client-tags";
import { formatTimeBR, formatDateBR } from "@/lib/date";
import { formatCurrencyBR } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { APPOINTMENT_STATUS, PAYMENT_STATUS, MESSAGE_TYPE } from "@/lib/status-labels";

export default async function ClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [client, stats] = await Promise.all([
    prisma.client.findUnique({
      where: { id },
      include: {
        appointments: { orderBy: { startTime: "desc" } },
        payments: { orderBy: { createdAt: "desc" } },
        planSubscriptions: { include: { plan: true }, orderBy: { purchasedAt: "desc" } },
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
  ]);

  if (!client) notFound();

  const [lifetimeAgg, sessoesDone, sessoesCanceladas] = stats;
  const lifetimeValue = lifetimeAgg._sum.amount ?? 0;

  const pendingPayments = client.payments.filter((p) => p.status === "PENDING");

  return (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto">
      <Link href="/clientes" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm mb-6">
        <ArrowLeft size={14} />
        Voltar
      </Link>

      <div className="flex flex-wrap items-start gap-4 mb-8">
        <div className="w-14 h-14 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-xl shrink-0">
          {client.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold text-gray-900 truncate">{client.name}</h2>
          {client.phone !== "00000000000" && (
            <p className="text-gray-500 text-sm flex items-center gap-1 mt-1">
              <Phone size={12} />
              {client.phone}
            </p>
          )}
          <div className="mt-2">
            <ClientTags clientId={client.id} initialTags={client.tags ?? []} />
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <SendWhatsappModal clientId={client.id} clientName={client.name} />
          <EditClientForm client={client} />
          <DeleteClientButton clientId={client.id} />
        </div>
      </div>

      {/* Lifetime stats */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-2 sm:p-4 text-center">
          <p className="text-xs sm:text-xl font-bold text-green-600 truncate tabular-nums">
            R${lifetimeValue.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
          </p>
          <p className="text-xs text-gray-400 mt-0.5 leading-tight">Total gasto</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-2 sm:p-4 text-center">
          <p className="text-xs sm:text-xl font-bold text-violet-600">{sessoesDone}</p>
          <p className="text-xs text-gray-400 mt-0.5 leading-tight">Sessões</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-2 sm:p-4 text-center">
          <p className="text-xs sm:text-xl font-bold text-gray-500">{sessoesCanceladas}</p>
          <p className="text-xs text-gray-400 mt-0.5 leading-tight">Cancelamentos</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Histórico de atendimentos */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar size={16} className="text-violet-600" />
            Atendimentos
          </h3>
          {client.appointments.length === 0 ? (
            <EmptyState title="Nenhum atendimento ainda." />
          ) : (
            <ul className="space-y-2">
              {client.appointments.slice(0, 8).map((appt) => (
                <li key={appt.id} className="flex justify-between items-center text-sm">
                  <div>
                    <span className="text-gray-700">
                      {formatDateBR(appt.startTime)} às {formatTimeBR(appt.startTime)}
                    </span>
                    <p className="text-xs text-gray-400">{appt.serviceType}</p>
                  </div>
                  <StatusBadge status={appt.status} map={APPOINTMENT_STATUS} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pagamentos */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign size={16} className="text-amber-500" />
            Pagamentos
          </h3>
          {client.payments.length === 0 ? (
            <EmptyState title="Nenhum pagamento ainda." />
          ) : (
            <ul className="space-y-2">
              {client.payments.slice(0, 8).map((p) => (
                <li key={p.id} className="flex justify-between items-center text-sm">
                  <div>
                    <span className="text-gray-700">{formatCurrencyBR(p.amount)}</span>
                    <span className="text-gray-400 text-xs ml-2">
                      {format(p.createdAt, "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={p.status} map={PAYMENT_STATUS} />
                    <PaymentRowActions paymentId={p.id} status={p.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          {pendingPayments.length > 0 && pendingPayments[0].appointmentId && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <PaymentButton
                appointmentId={pendingPayments[0].appointmentId}
                amount={pendingPayments[0].amount}
                clientName={client.name}
              />
            </div>
          )}
        </div>

        {/* Mensagens enviadas */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 md:col-span-2">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MessageSquare size={16} className="text-green-600" />
            Mensagens WhatsApp
          </h3>
          {client.whatsappLogs.length === 0 ? (
            <EmptyState title="Nenhuma mensagem enviada ainda." />
          ) : (
            <ul className="space-y-3">
              {client.whatsappLogs.map((log) => (
                <li key={log.id} className="text-sm border-l-2 border-green-200 pl-3">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={log.type} map={MESSAGE_TYPE} />
                    <span className="text-gray-400 text-xs">
                      {format(log.sentAt, "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  <p className="text-gray-600 text-xs whitespace-pre-line">{log.message}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
