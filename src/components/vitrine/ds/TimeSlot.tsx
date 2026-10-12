"use client";

import { useState } from "react";

type State = "available" | "selected" | "taken";

export function TimeSlot({ time, state = "available", onClick }: { time: string; state?: State; onClick?: () => void }) {
  const [hover, setHover] = useState(false);
  const disabled = state === "taken";
  const selected = state === "selected";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={selected}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        minHeight: "var(--tap-min)",
        padding: "0 var(--space-16)",
        borderRadius: "var(--radius-control)",
        font: "var(--type-body)",
        fontSize: "var(--size-body-s)",
        fontVariantNumeric: "tabular-nums",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "var(--transition-control)",
        background: selected ? "var(--action-primary)" : disabled ? "var(--surface-sunken)" : hover ? "var(--clay-50)" : "var(--surface-card)",
        color: selected ? "var(--action-primary-fg)" : disabled ? "var(--text-subtle)" : "var(--text-body)",
        border: "1px solid " + (selected ? "var(--action-primary)" : "var(--border-hairline)"),
        textDecoration: disabled ? "line-through" : "none",
      }}
    >
      {time}
    </button>
  );
}
