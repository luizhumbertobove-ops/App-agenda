import "../bove-ds.css";
import type { CSSProperties } from "react";

// Esqueleto do agendamento: mesmo contêiner de 560px e espaçamentos da página real.
function Skel({ style }: { style: CSSProperties }) {
  return <span className="ds-skeleton" style={{ minHeight: 0, ...style }} />;
}

export default function Loading() {
  return (
    <div className="bove-ds" aria-busy="true" style={{ background: "var(--surface-page)", minHeight: "100vh" }}>
      <span className="sr-only">Carregando</span>
      <div className="max-w-[560px] mx-auto px-[var(--gutter-inline)] py-12 lg:py-[var(--section-y-compact)] flex flex-col gap-8">
        {/* Título */}
        <div className="flex flex-col gap-3">
          <Skel style={{ height: 12, width: 120 }} />
          <Skel style={{ height: 36, width: "75%" }} />
        </div>

        {/* Serviços */}
        <div className="flex flex-col gap-3">
          <Skel style={{ height: 12, width: 90 }} />
          <Skel style={{ height: 72, width: "100%", borderRadius: "var(--radius-card)" }} />
          <Skel style={{ height: 72, width: "100%", borderRadius: "var(--radius-card)" }} />
          <Skel style={{ height: 72, width: "100%", borderRadius: "var(--radius-card)" }} />
        </div>

        {/* Horários */}
        <div className="flex flex-col gap-3">
          <Skel style={{ height: 12, width: 80 }} />
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {Array.from({ length: 8 }, (_, i) => (
              <Skel key={i} style={{ height: "var(--tap-min)", width: "100%" }} />
            ))}
          </div>
        </div>

        {/* Campos */}
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Skel style={{ height: 12, width: 80 }} />
            <Skel style={{ height: 48, width: "100%" }} />
          </div>
          <div className="flex flex-col gap-2">
            <Skel style={{ height: 12, width: 60 }} />
            <Skel style={{ height: 48, width: "100%" }} />
          </div>
        </div>

        {/* Botão */}
        <Skel style={{ height: 52, width: "100%", borderRadius: "var(--radius-pill)" }} />
      </div>
    </div>
  );
}
