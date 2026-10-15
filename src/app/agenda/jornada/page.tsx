export const dynamic = "force-dynamic";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getWorkSchedule } from "@/lib/settings";
import { JornadaForm } from "./jornada-form";

export default async function JornadaPage() {
  const jornada = await getWorkSchedule();

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-5 pt-6 pb-24">
      <Link
        href="/agenda"
        className="inline-flex min-h-11 items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
      >
        <ChevronLeft size={16} aria-hidden />
        Agenda
      </Link>

      <header>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-amber-700">Agenda</p>
        <h1 className="font-display text-3xl text-gray-900">Jornada de trabalho</h1>
        <p className="mt-1 text-sm text-gray-500">
          Os dias e horários em que você atende. A agenda mostra os horários livres dentro da jornada, e a
          vitrine só oferece esses horários aos clientes.
        </p>
      </header>

      <JornadaForm inicial={jornada} />
    </div>
  );
}
