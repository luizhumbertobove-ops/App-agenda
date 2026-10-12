"use client";

import { useState } from "react";

export function Tag({
  selected = false,
  onClick,
  icon,
  children,
}: {
  selected?: boolean;
  onClick?: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [hover, setHover] = useState(false);
  const clickable = typeof onClick === "function";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={clickable ? selected : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--space-6)",
        height: 32,
        padding: "0 14px",
        borderRadius: "var(--radius-pill)",
        font: "var(--type-caption)",
        fontWeight: "var(--weight-medium)",
        cursor: clickable ? "pointer" : "default",
        transition: "var(--transition-control)",
        background: selected ? "var(--clay-500)" : hover && clickable ? "var(--clay-50)" : "var(--surface-card)",
        color: selected ? "var(--action-primary-fg)" : "var(--text-body)",
        border: "1px solid " + (selected ? "var(--clay-500)" : "var(--border-hairline)"),
      }}
    >
      {icon}
      {children}
    </button>
  );
}
