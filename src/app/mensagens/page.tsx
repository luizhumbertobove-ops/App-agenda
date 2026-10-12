export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MessageSquare } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { MessageSettingsForm } from "@/components/message-settings-form";
import { MessageTriggerButtons } from "@/components/message-trigger-buttons";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { MESSAGE_TYPE } from "@/lib/status-labels";
import { EmptyState } from "@/components/empty-state";

export default async function MensagensPage() {
  const [logs, settings] = await Promise.all([
    prisma.whatsappLog.findMany({
      include: { client: true },
      orderBy: { sentAt: "desc" },
      take: 100,
    }),
    getSettings(),
  ]);

  const stats = {
    total: logs.length,
    confirmation: logs.filter((l) => l.type === "CONFIRMATION").length,
    payment: logs.filter((l) => l.type === "PAYMENT_LINK").length,
    reengagement: logs.filter((l) => l.type === "REENGAGEMENT").length,
    noShow: logs.filter((l) => l.type === ("NO_SHOW" as string)).length,
  };

  return (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto">
      <PageHeader title="Mensagens" subtitle="Histórico e configurações de envio via WhatsApp" />

      <div className="mb-6">
        <MessageTriggerButtons />
      </div>

      <div className="mb-8">
        <MessageSettingsForm settings={settings} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.confirmation}</p>
          <p className="text-xs text-gray-500 mt-1">Confirmações</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{stats.payment}</p>
          <p className="text-xs text-gray-500 mt-1">Links de pagamento</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">{stats.reengagement}</p>
          <p className="text-xs text-gray-500 mt-1">Reengajamentos</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-orange-600">{stats.noShow}</p>
          <p className="text-xs text-gray-500 mt-1">Não compareceu</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <MessageSquare size={16} className="text-gray-400" />
            Histórico de mensagens
          </h3>
        </div>
        {logs.length === 0 ? (
          <EmptyState title="Nenhuma mensagem enviada ainda." padded />
        ) : (
          <div className="divide-y divide-gray-50">
            {logs.map((log) => (
              <div key={log.id} className="px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800">{log.client.name}</span>
                    <StatusBadge status={log.type} map={MESSAGE_TYPE} />
                  </div>
                  <span className="text-xs text-gray-400">
                    {format(log.sentAt, "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </span>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2">{log.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
