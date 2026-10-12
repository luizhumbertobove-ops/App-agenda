export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { Clock, DollarSign, Package } from "lucide-react";
import { NewServiceModal, EditServiceModal } from "@/components/service-modal";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { formatCurrencyBR } from "@/lib/format";

export default async function ServicosPage() {
  const services = await prisma.service.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="p-3 sm:p-6 max-w-3xl mx-auto">
      <PageHeader
        title="Serviços"
        subtitle={`${services.length} serviço${services.length !== 1 ? "s" : ""} cadastrado${services.length !== 1 ? "s" : ""}`}
        action={<NewServiceModal />}
      />

      {services.length === 0 ? (
        <EmptyState
          icon={<Package size={40} className="text-gray-300 mx-auto mb-3" />}
          title="Nenhum serviço cadastrado ainda."
          subtitle="Cadastre seus serviços para usar ao criar atendimentos."
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {services.map((service) => (
            <div
              key={service.id}
              className="flex items-center justify-between px-5 py-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
                  <Package size={16} className="text-violet-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{service.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock size={10} />
                      {service.durationMins} min
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <DollarSign size={10} />
                      {formatCurrencyBR(service.price)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!service.active && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                    Inativo
                  </span>
                )}
                <EditServiceModal service={service} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
