"use client";

import { pressTransition, usePress } from "./use-press";

type State = "available" | "selected" | "taken";

export function TimeSlot({
  time,
  state = "available",
  onClick,
  highlight,
}: {
  time: string;
  state?: State;
  onClick?: () => void;
  /** Destaque da seleção (ex.: motion com layoutId), renderizado atrás do texto. Sem ele, o fundo é --action-primary. */
  highlight?: React.ReactNode;
}) {
  const disabled = state === "taken";
  const selected = state === "selected";
  const { hover, press, handlers } = usePress(disabled);
  const fundoSelecionado = selected && !highlight;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={selected}
      {...handlers}
      style={{
        minHeight: "var(--tap-min)",
        padding: "0 var(--space-16)",
        borderRadius: "var(--radius-control)",
        font: "var(--type-body)",
        fontSize: "var(--size-body-s)",
        fontVariantNumeric: "tabular-nums",
        fontWeight: selected ? "var(--weight-medium)" : undefined,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: `var(--transition-control), ${pressTransition(press)}`,
        transform: press && !disabled ? "scale(var(--press-scale))" : "none",
        position: "relative",
        isolation: "isolate",
        background: fundoSelecionado ? "var(--action-primary)" : disabled ? "var(--surface-sunken)" : hover ? "var(--clay-50)" : "var(--surface-card)",
        color: selected ? "var(--action-primary-fg)" : disabled ? "var(--text-subtle)" : "var(--text-body)",
        border: "1px solid " + (selected ? "var(--action-primary)" : hover && !disabled ? "var(--border-accent)" : "var(--border-hairline)"),
        textDecoration: disabled ? "line-through" : "none",
      }}
    >
      {selected && highlight}
      <span style={{ position: "relative" }}>{time}</span>
    </button>
  );
}
