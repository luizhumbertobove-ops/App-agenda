"use client";

import { useState } from "react";

type Tone = "default" | "flat" | "soft" | "sage" | "inverse";

const tones: Record<Tone, React.CSSProperties> = {
  default: { background: "var(--surface-card)", boxShadow: "var(--shadow-hairline), var(--shadow-soft)" },
  flat: { background: "var(--surface-card)", boxShadow: "var(--shadow-hairline)" },
  soft: { background: "var(--surface-accent-soft)", boxShadow: "none" },
  sage: { background: "var(--surface-sage-soft)", boxShadow: "none" },
  inverse: { background: "var(--surface-inverse)", color: "var(--text-inverse)", boxShadow: "none" },
};

export function Card({
  tone = "default",
  interactive = false,
  padding = "var(--space-24)",
  className,
  style,
  onClick,
  children,
}: {
  tone?: Tone;
  interactive?: boolean;
  padding?: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={className}
      style={{
        borderRadius: "var(--radius-card)",
        padding,
        transition: "var(--transition-surface)",
        ...tones[tone],
        ...(interactive && hover
          ? { transform: "var(--lift-hover)", boxShadow: "var(--shadow-hairline), var(--shadow-lifted)", cursor: "pointer" }
          : null),
        ...style,
      }}
    >
      {children}
    </div>
  );
}
