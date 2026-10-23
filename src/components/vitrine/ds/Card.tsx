"use client";

import { usePress } from "./use-press";

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
  const { hover, press, handlers } = usePress();

  // Interativo: sobe no hover e afunda no aperto (o aperto vence o hover).
  const estadoInterativo: React.CSSProperties = interactive
    ? {
        transition: press
          ? "transform var(--dur-instant) var(--ease-standard), box-shadow var(--dur-base) var(--ease-out-soft)"
          : "var(--transition-surface)",
        ...(press
          ? { transform: "scale(var(--press-scale-soft))" }
          : hover
            ? { transform: "var(--lift-hover)", boxShadow: "var(--shadow-hairline), var(--shadow-lifted)", cursor: "pointer" }
            : null),
      }
    : {};

  return (
    <div
      onClick={onClick}
      {...(interactive ? handlers : null)}
      className={className}
      style={{
        borderRadius: "var(--radius-card)",
        padding,
        transition: "var(--transition-surface)",
        ...tones[tone],
        ...estadoInterativo,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
