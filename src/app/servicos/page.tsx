export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { Package } from "lucide-react";
import { NewServiceModal, EditServiceModal } from "@/components/service-modal";
import { formatCurrencyBR } from "@/lib/format";
import { pageShell } from "@/components/page-shell";

export default async function ServicosPage() {
  const services = await prisma.service.findMany({ orderBy: { name: "asc" } });
  const total = services.length;
  const naVitrine = services.filter((s) => s.active).length;

  return (
    <div className={`${pageShell()} space-y-6`}>
      <header className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-amber-700">
            {total} {total === 1 ? "serviço" : "serviços"} · {naVitrine} na vitrine
          </p>
          <h2 className="font-display text-3xl text-gray-900">Serviços</h2>
        </div>
        <NewServiceModal />
      </header>

      {total === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <Package size={36} className="mx-auto mb-3 text-gray-300" aria-hidden="true" />
          <p className="font-medium text-gray-700">Nenhum serviço cadastrado ainda.</p>
          <div className="mt-4 flex justify-center">
            <NewServiceModal fullLabel />
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200 bg-white @4xl:grid @4xl:grid-cols-2 @4xl:gap-3 @4xl:divide-y-0 @4xl:overflow-visible @4xl:border-0 @4xl:bg-transparent">
          {services.map((service) => (
            <li
              key={service.id}
              className="flex min-h-16 items-center gap-3 bg-white px-4 py-3 @4xl:rounded-xl @4xl:border @4xl:border-gray-200"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-display text-lg text-gray-900">{service.name}</p>
                  {!service.active && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      Fora da vitrine
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  {service.durationMins} min · {formatCurrencyBR(service.price)}
                </p>
              </div>
              <EditServiceModal service={service} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
