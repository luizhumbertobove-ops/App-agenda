"use client";

import { useEffect, useRef, useState } from "react";
import { Star } from "lucide-react";
import { Icon } from "@/components/vitrine/ds/Icon";

/**
 * Estrelas de uma nota (0 a 5). Preenchidas com a cor do texto de destaque; vazias na
 * cor de borda. É a exceção à regra de ícones só em linha: a nota é convenção de estrela cheia.
 */
export function Estrelas({ nota, tamanho = 16 }: { nota: number; tamanho?: number }) {
  const cheias = Math.round(nota);
  return (
    <span role="img" aria-label={`Nota ${nota.toFixed(1).replace(".", ",")} de 5`} style={{ display: "inline-flex", gap: 2, color: "var(--text-accent)" }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon
          key={n}
          icon={Star}
          size={tamanho}
          fill={n <= cheias ? "currentColor" : "none"}
          style={n <= cheias ? undefined : { color: "var(--border-default)" }}
        />
      ))}
    </span>
  );
}

/** Cartão de uma avaliação do Google. O texto corta em 6 linhas; "Ler mais" aparece só se cortou. */
export function CartaoAvaliacao({
  autor,
  nota,
  texto,
  data,
}: {
  autor: string;
  nota: number;
  texto: string;
  data: string | null;
}) {
  const [expandido, setExpandido] = useState(false);
  const [cortado, setCortado] = useState(false);
  const textoRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = textoRef.current;
    if (!el || expandido) return;
    const medir = () => setCortado(el.scrollHeight > el.clientHeight + 1);
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    return () => observador.disconnect();
  }, [texto, expandido]);

  return (
    <article
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-16)",
        flex: 1,
        padding: "var(--space-24)",
        background: "var(--surface-page)",
        border: "1px solid var(--border-hairline)",
        borderRadius: "var(--radius-card)",
        boxShadow: "var(--shadow-soft)",
      }}
    >
      <Estrelas nota={nota} />
      <p
        ref={textoRef}
        style={{
          font: "var(--type-body)",
          color: "var(--text-body)",
          textWrap: "pretty",
          display: expandido ? "block" : "-webkit-box",
          WebkitLineClamp: expandido ? undefined : 6,
          WebkitBoxOrient: "vertical",
          overflow: expandido ? "visible" : "hidden",
        }}
      >
        {texto}
      </p>
      {(cortado || expandido) && (
        <button
          type="button"
          onClick={() => setExpandido((v) => !v)}
          aria-expanded={expandido}
          style={{
            alignSelf: "flex-start",
            minHeight: "var(--tap-min)",
            padding: "0 var(--space-4)",
            background: "none",
            border: 0,
            cursor: "pointer",
            font: "var(--type-caption)",
            fontWeight: "var(--weight-medium)",
            color: "var(--text-link)",
            textDecoration: "underline",
            textUnderlineOffset: 3,
          }}
        >
          {expandido ? "Ler menos" : "Ler mais"}
        </button>
      )}
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <span style={{ font: "var(--type-heading)", color: "var(--text-strong)" }}>{autor}</span>
        {data && <span style={{ font: "var(--type-caption)", color: "var(--text-muted)" }}>{data}</span>}
      </div>
    </article>
  );
}
