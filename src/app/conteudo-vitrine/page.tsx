export const dynamic = "force-dynamic";

import { ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getFotosGaleria } from "@/lib/galeria";
import { getVitrineContent, VITRINE_CAMPOS } from "@/lib/vitrine-content";
import { GaleriaManager } from "./galeria-manager";
import { VitrineForm } from "./vitrine-form";
import { pageShell } from "@/components/page-shell";

export default async function ConteudoVitrinePage() {
  const [valores, fotos] = await Promise.all([getVitrineContent(), getFotosGaleria()]);

  return (
    <div className={pageShell({ narrow: true })}>
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

      <div className="flex flex-col gap-6">
        <GaleriaManager fotos={fotos} />
        <VitrineForm campos={VITRINE_CAMPOS} valores={valores} />
      </div>
    </div>
  );
}
