import "./bove-ds.css";
import type { CSSProperties } from "react";

// Esqueleto da vitrine: mesmas faixas, contêiner e alturas da página real para não haver salto ao carregar.
function Skel({ style }: { style: CSSProperties }) {
  return <span className="ds-skeleton" style={{ minHeight: 0, ...style }} />;
}

export default function Loading() {
  return (
    <div className="bove-ds" aria-busy="true" style={{ background: "var(--surface-page)", minHeight: "100vh" }}>
      <span className="sr-only">Carregando</span>

      {/* Header */}
      <div className="sticky top-0 z-20 border-b" style={{ background: "rgba(250,246,241,.86)", borderColor: "var(--border-hairline)" }}>
        <div className="max-w-[var(--container-max)] mx-auto flex items-center gap-6 lg:gap-10 px-[var(--gutter-inline)] lg:px-[var(--gutter-inline-lg)] py-4">
          <div className="flex flex-col gap-[5px] max-w-full" style={{ width: 170 }}>
            <Skel style={{ height: 22, width: "100%" }} />
            <Skel style={{ height: 10, width: 120 }} />
          </div>
          <div className="hidden md:flex gap-8 ml-auto">
            <Skel style={{ height: 12, width: 72 }} />
            <Skel style={{ height: 12, width: 64 }} />
            <Skel style={{ height: 12, width: 80 }} />
          </div>
          <div className="ml-auto md:ml-0">
            <Skel style={{ height: 36, width: 150, borderRadius: "var(--radius-pill)" }} />
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="max-w-[var(--container-max)] mx-auto px-[var(--gutter-inline)] lg:px-[var(--gutter-inline-lg)] py-16 lg:py-[var(--section-y)] grid grid-cols-1 lg:grid-cols-[1.05fr_.95fr] gap-10 lg:gap-[var(--space-72)] items-center">
        <div className="flex flex-col gap-6 min-w-0 max-w-full">
          <Skel style={{ height: 12, width: 140 }} />
          <div className="flex flex-col gap-2">
            <Skel style={{ height: "clamp(28px, 5vw, 52px)", width: "100%" }} />
            <Skel style={{ height: "clamp(28px, 5vw, 52px)", width: "70%" }} />
          </div>
          <div className="flex flex-col gap-2" style={{ maxWidth: "var(--measure-narrow)" }}>
            <Skel style={{ height: 16, width: "100%" }} />
            <Skel style={{ height: 16, width: "100%" }} />
            <Skel style={{ height: 16, width: "60%" }} />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Skel style={{ height: 52, width: 220, borderRadius: "var(--radius-pill)" }} />
            <Skel style={{ height: 52, width: 220, borderRadius: "var(--radius-pill)" }} />
          </div>
        </div>
        <div className="min-w-0 max-w-full w-full">
          <Skel style={{ width: "100%", aspectRatio: "4 / 5", borderRadius: "var(--radius-card)" }} />
        </div>
      </section>

      {/* Faixa 1: sobre */}
      <section style={{ background: "var(--surface-card)", borderTop: "1px solid var(--border-hairline)", borderBottom: "1px solid var(--border-hairline)" }}>
        <div className="max-w-[var(--container-max)] mx-auto px-[var(--gutter-inline)] lg:px-[var(--gutter-inline-lg)] py-14 lg:py-[var(--section-y)] flex flex-col gap-10">
          <div className="flex flex-col gap-3 max-w-full">
            <Skel style={{ height: 12, width: 120 }} />
            <Skel style={{ height: 32, width: "min(60%, 360px)" }} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skel style={{ height: 180, width: "100%", borderRadius: "var(--radius-card)" }} />
            <Skel style={{ height: 180, width: "100%", borderRadius: "var(--radius-card)" }} />
            <Skel style={{ height: 180, width: "100%", borderRadius: "var(--radius-card)" }} />
          </div>
        </div>
      </section>

      {/* Faixa 2: serviços */}
      <section style={{ background: "var(--surface-sage-soft)" }}>
        <div className="max-w-[var(--container-max)] mx-auto px-[var(--gutter-inline)] lg:px-[var(--gutter-inline-lg)] py-14 lg:py-[var(--section-y)] flex flex-col gap-10">
          <div className="flex flex-col gap-3 max-w-full">
            <Skel style={{ height: 12, width: 120 }} />
            <Skel style={{ height: 32, width: "min(60%, 360px)" }} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skel style={{ height: 180, width: "100%", borderRadius: "var(--radius-card)" }} />
            <Skel style={{ height: 180, width: "100%", borderRadius: "var(--radius-card)" }} />
            <Skel style={{ height: 180, width: "100%", borderRadius: "var(--radius-card)" }} />
          </div>
        </div>
      </section>
    </div>
  );
}
