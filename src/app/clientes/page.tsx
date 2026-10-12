export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { formatDateBR } from "@/lib/date";
import { Users, Phone, Calendar, AlertCircle, UserPlus, Globe } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { ClientSearch } from "@/components/client-search";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const clients = await prisma.client.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
          ],
        }
      : undefined,
    include: {
      appointments: { orderBy: { startTime: "desc" }, take: 1 },
      payments: { where: { status: { in: ["PENDING", "SENT"] } } },
      planSubscriptions: { where: { active: true }, include: { plan: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="p-3 sm:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <PageHeader
          title="Clientes"
          subtitle={
            q
              ? `${clients.length} resultado${clients.length !== 1 ? "s" : ""} para "${q}"`
              : `${clients.length} cadastrado${clients.length !== 1 ? "s" : ""}`
          }
          className="mb-3"
          action={
            <div className="flex items-center gap-2">
              <Link
                href="/clientes/importar"
                className="flex items-center gap-2 border border-gray-200 text-gray-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <Globe size={15} className="text-blue-500" />
                <span className="hidden sm:inline">Importar do Google</span>
              </Link>
              <Link
                href="/clientes/novo"
                className="flex items-center gap-2 bg-violet-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors"
              >
                <UserPlus size={16} />
                <span className="hidden sm:inline">Novo Cliente</span>
              </Link>
            </div>
          }
        />
        <Suspense fallback={null}>
          <ClientSearch defaultValue={q} />
        </Suspense>
      </div>

      {clients.length === 0 ? (
        <EmptyState
          icon={<Users size={40} className="text-gray-300 mx-auto mb-3" />}
          title={q ? `Nenhum cliente encontrado para "${q}".` : "Nenhum cliente cadastrado ainda."}
          subtitle={
            q ? (
              "Tente outro nome ou telefone."
            ) : (
              <span className="mb-5 block">Cadastre o primeiro cliente para começar a agendar.</span>
            )
          }
          action={
            !q && (
              <Link
                href="/clientes/novo"
                className="inline-flex items-center gap-2 bg-violet-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors"
              >
                <UserPlus size={15} />
                Cadastrar primeiro cliente
              </Link>
            )
          }
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {clients.map((client) => {
            const lastAppt = client.appointments[0];
            const pendingCount = client.payments.length;
            const activePlan = client.planSubscriptions[0];

            return (
              <Link
                key={client.id}
                href={`/clientes/${client.id}`}
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-semibold text-sm shrink-0">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{client.name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Phone size={10} />
                        {client.phone}
                      </span>
                      {lastAppt && (
                        <span className="hidden sm:flex text-xs text-gray-400 items-center gap-1">
                          <Calendar size={10} />
                          {formatDateBR(lastAppt.startTime)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {activePlan && (
                    <span className="hidden sm:inline text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">
                      {activePlan.plan.name}
                    </span>
                  )}
                  {pendingCount > 0 && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <AlertCircle size={10} />
                      {pendingCount}
                    </span>
                  )}
                  <span className="text-gray-300 text-lg">›</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
