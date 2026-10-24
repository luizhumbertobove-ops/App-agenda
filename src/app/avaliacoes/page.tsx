export const dynamic = "force-dynamic";

import { ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";
import { AvaliacoesManager, type AvaliacaoAdmin } from "./avaliacoes-manager";
import { pageShell } from "@/components/page-shell";

export default async function AvaliacoesPage() {
  const avaliacoes = await prisma.googleReview.findMany({
    orderBy: [{ status: "asc" }, { publishedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    select: { id: true, author: true, rating: true, text: true, status: true, source: true, publishedAt: true },
  });

  const lista: AvaliacaoAdmin[] = avaliacoes.map((a) => ({
    ...a,
    publishedAt: a.publishedAt ? a.publishedAt.toISOString() : null,
  }));

  return (
    <div className={pageShell({ narrow: true })}>
      <PageHeader
        title="Avaliações"
        subtitle="Escolha quais avaliações do Google aparecem na vitrine"
        action={
          <a
            href="/vitrine"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm font-medium text-violet-700 hover:underline shrink-0"
          >
            Ver vitrine
            <ExternalLink size={14} />
          </a>
        }
      />

      <AvaliacoesManager avaliacoes={lista} />
    </div>
  );
}
