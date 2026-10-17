export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { formatDateBR, formatTimeBR, nowBR } from "@/lib/date";
import { MessageSettingsForm } from "@/components/message-settings-form";
import { MessageTriggerButtons } from "@/components/message-trigger-buttons";
import { StatusBadge } from "@/components/status-badge";
import { MESSAGE_TYPE } from "@/lib/status-labels";
import { EmptyState } from "@/components/empty-state";
import { WhatsappStatus } from "@/components/whatsapp-status";

/** Primeiro instante do mês atual em horário de Brasília (00:00 BRT = 03:00 UTC). */
function inicioDoMesBR(): Date {
  const agora = nowBR();
  return new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), 1, 3));
}

export default async function MensagensPage() {
  const [recentes, porTipo, settings] = await Promise.all([
    prisma.whatsappLog.findMany({
      include: { client: true },
      orderBy: { sentAt: "desc" },
      take: 30,
    }),
    // Contagem no banco: o histórico mostra só as 30 últimas, os contadores precisam do mês inteiro.
    prisma.whatsappLog.groupBy({
      by: ["type"],
      where: { sentAt: { gte: inicioDoMesBR() } },
      _count: true,
    }),
    getSettings(),
  ]);

  const doTipo = (tipo: string) => porTipo.find((g) => g.type === tipo)?._count ?? 0;
  const contadores = [
    { rotulo: "Confirmações", valor: doTipo("CONFIRMATION") },
    { rotulo: "Links de pagamento", valor: doTipo("PAYMENT_LINK") },
    { rotulo: "Reengajamentos", valor: doTipo("REENGAGEMENT") },
    { rotulo: "Não compareceu", valor: doTipo("NO_SHOW") },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-5 pt-6 pb-24">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-amber-700">WhatsApp</p>
        <h1 className="font-display text-3xl text-gray-900">Mensagens</h1>
      </header>

      <WhatsappStatus />

      <section className="space-y-3">
        <p className="text-sm text-gray-500">Neste mês</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {contadores.map((c) => (
            <div key={c.rotulo} className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="font-display text-2xl text-gray-900">{c.valor}</p>
              <p className="text-sm text-gray-500">{c.rotulo}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl text-gray-900">Envios manuais</h2>
        <MessageTriggerButtons />
      </section>

      <MessageSettingsForm settings={settings} />

      <section className="space-y-3">
        <h2 className="font-display text-2xl text-gray-900">Histórico</h2>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          {recentes.length === 0 ? (
            <EmptyState title="Nenhuma mensagem enviada ainda." padded />
          ) : (
            <ul className="divide-y divide-gray-100">
              {recentes.map((log) => (
                <li key={log.id} className="space-y-1 px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-gray-900">{log.client.name}</span>
                    <StatusBadge status={log.type} map={MESSAGE_TYPE} />
                  </div>
                  <p className="text-xs text-gray-500">
                    {formatDateBR(log.sentAt)} às {formatTimeBR(log.sentAt)}
                  </p>
                  <p className="line-clamp-2 text-sm text-gray-600">{log.message}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
