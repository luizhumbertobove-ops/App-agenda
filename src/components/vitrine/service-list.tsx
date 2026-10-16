"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { ServiceCard } from "@/components/vitrine/ds/ServiceCard";
import { Button } from "@/components/vitrine/ds/Button";
import { Icon } from "@/components/vitrine/ds/Icon";

export type VitrineService = {
  id: string;
  name: string;
  duration: string;
  price: string;
  description: string | null;
  sessionDetails: string | null;
};

/**
 * Cards de serviço da vitrine. Serviço com texto ("O que é" / "Como é a sessão") abre
 * um dialog com os detalhes; sem texto, o card leva direto ao agendamento.
 */
export function ServiceList({ services }: { services: VitrineService[] }) {
  const [aberto, setAberto] = useState<VitrineService | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[var(--space-24)]">
        {services.map((service) => {
          const card = (
            <ServiceCard name={service.name} duration={service.duration} price={service.price} />
          );
          return service.description || service.sessionDetails ? (
            <button
              key={service.id}
              type="button"
              onClick={() => setAberto(service)}
              aria-label={`Ver detalhes de ${service.name}`}
              className="block h-full w-full text-left"
            >
              {card}
            </button>
          ) : (
            <Link key={service.id} href={`/vitrine/agendar?servico=${service.id}`} className="block h-full">
              {card}
            </Link>
          );
        })}
      </div>

      {aberto && <ServiceDialog service={aberto} onClose={() => setAberto(null)} />}
    </>
  );
}

function ServiceDialog({ service, onClose }: { service: VitrineService; onClose: () => void }) {
  const boxRef = useRef<HTMLDivElement>(null);
  // Mesma regra do Modal do app: o efeito roda só ao abrir, com onClose lido de uma ref.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCloseRef.current();
    }
    document.addEventListener("keydown", onKeyDown);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    boxRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
    };
  }, []);

  const titleId = `servico-${service.id}`;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
      style={{ background: "var(--surface-overlay)" }}
    >
      <div
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative w-full max-w-[560px] max-h-[90dvh] overflow-y-auto outline-none"
        style={{
          background: "var(--surface-card)",
          borderRadius: "var(--radius-sheet)",
          boxShadow: "var(--shadow-sheet)",
          padding: "var(--space-32) var(--space-24) var(--space-24)",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-3 top-3 flex size-11 items-center justify-center rounded-full"
          style={{ color: "var(--text-muted)" }}
        >
          <Icon icon={X} size={20} />
        </button>

        <p className="ds-eyebrow">Serviço</p>
        <h3
          id={titleId}
          style={{
            font: "var(--type-heading)",
            fontFamily: "var(--font-serif-display)",
            fontWeight: "var(--weight-regular)",
            fontSize: "var(--size-heading-l)",
            color: "var(--text-strong)",
            margin: "var(--space-8) 0 var(--space-8)",
            paddingRight: "var(--space-32)",
          }}
        >
          {service.name}
        </h3>
        <p style={{ font: "var(--type-caption)", color: "var(--text-muted)" }}>
          {service.duration} · {service.price}
        </p>

        {service.description && (
          <section style={{ marginTop: "var(--space-24)" }}>
            <h4 className="ds-eyebrow" style={{ marginBottom: "var(--space-8)" }}>
              O que é
            </h4>
            <p className="whitespace-pre-line" style={{ font: "var(--type-body)", color: "var(--text-body)" }}>
              {service.description}
            </p>
          </section>
        )}

        {service.sessionDetails && (
          <section style={{ marginTop: "var(--space-24)" }}>
            <h4 className="ds-eyebrow" style={{ marginBottom: "var(--space-8)" }}>
              Como é a sessão
            </h4>
            <p className="whitespace-pre-line" style={{ font: "var(--type-body)", color: "var(--text-body)" }}>
              {service.sessionDetails}
            </p>
          </section>
        )}

        <div style={{ marginTop: "var(--space-32)" }}>
          <Button href={`/vitrine/agendar?servico=${service.id}`} fullWidth>
            Agendar este serviço
          </Button>
        </div>
      </div>
    </div>
  );
}
