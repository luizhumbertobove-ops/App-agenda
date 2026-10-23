"use client";

import { useState } from "react";

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
  const [hover, setHover] = useState(false);
  const [press, setPress] = useState(false);
  const disabled = state === "taken";
  const selected = state === "selected";
  const fundoSelecionado = selected && !highlight;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={selected}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setPress(false);
      }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      style={{
        minHeight: "var(--tap-min)",
        padding: "0 var(--space-16)",
        borderRadius: "var(--radius-control)",
        font: "var(--type-body)",
        fontSize: "var(--size-body-s)",
        fontVariantNumeric: "tabular-nums",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "var(--transition-control), transform var(--dur-fast) var(--ease-standard)",
        transform: press && !disabled ? "scale(var(--press-scale))" : "none",
        position: "relative",
        isolation: "isolate",
        background: fundoSelecionado ? "var(--action-primary)" : disabled ? "var(--surface-sunken)" : hover ? "var(--clay-50)" : "var(--surface-card)",
        color: selected ? "var(--action-primary-fg)" : disabled ? "var(--text-subtle)" : "var(--text-body)",
        border: "1px solid " + (selected ? "var(--action-primary)" : "var(--border-hairline)"),
        textDecoration: disabled ? "line-through" : "none",
      }}
    >
      {selected && highlight}
      <span style={{ position: "relative" }}>{time}</span>
    </button>
  );
}
