export const dynamic = "force-dynamic";

import { ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getVitrineContent, VITRINE_CAMPOS } from "@/lib/vitrine-content";
import { VitrineForm } from "./vitrine-form";

export default async function ConteudoVitrinePage() {
  const valores = await getVitrineContent();

  return (
    <div className="p-3 sm:p-6 max-w-3xl mx-auto">
      <PageHeader
        title="Vitrine"
        subtitle="Textos, contato e fotos da vitrine pública"
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

      <VitrineForm campos={VITRINE_CAMPOS} valores={valores} />
    </div>
  );
}
