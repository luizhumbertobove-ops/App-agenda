import "../bove-ds.css";

import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { AgendarForm } from "@/components/vitrine/agendar-form";
import { getVitrineContent } from "@/lib/vitrine-content";
import { WEEKDAYS, describeSchedule } from "@/lib/work-schedule";
import { getWorkSchedule } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Agendar horário — Humberto Bove | Spaço Lhum",
  description: "Reserve seu horário de massoterapia com Humberto Bove no Spaço Lhum.",
};

async function getServices() {
  return prisma.service.findMany({
    where: { active: true },
    orderBy: { price: "asc" },
  });
}

export default async function AgendarPage({
  searchParams,
}: {
  searchParams: Promise<{ servico?: string }>;
}) {
  const [{ servico }, services, conteudo, jornada] = await Promise.all([
    searchParams,
    getServices(),
    getVitrineContent(),
    getWorkSchedule(),
  ]);
  const workDays = WEEKDAYS.filter((d) => jornada[d.key]).map((d) => d.key);

  return (
    <div className="bove-ds" style={{ background: "var(--surface-page)", minHeight: "100vh" }}>
      <div className="max-w-[560px] mx-auto px-[var(--gutter-inline)] py-12 lg:py-[var(--section-y-compact)]">
        <AgendarForm
          services={services}
          initialServiceId={servico}
          whatsapp={conteudo.telefoneWhatsapp.replace(/\D/g, "")}
          workDays={workDays}
          scheduleText={describeSchedule(jornada)}
        />
      </div>
    </div>
  );
}
