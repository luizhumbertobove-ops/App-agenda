type Tone = "neutral" | "accent" | "success" | "warning" | "danger";

const tones: Record<Tone, React.CSSProperties> = {
  neutral: { background: "var(--status-info-soft)", color: "var(--linen-600)" },
  accent: { background: "var(--clay-50)", color: "var(--clay-600)" },
  success: { background: "var(--status-success-soft)", color: "var(--sage-600)" },
  warning: { background: "var(--status-warning-soft)", color: "var(--ochre-600)" },
  danger: { background: "var(--status-danger-soft)", color: "var(--rust-600)" },
};

export function Badge({
  tone = "neutral",
  dot = false,
  style,
  children,
}: {
  tone?: Tone;
  dot?: boolean;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--space-6)",
        padding: "3px 10px",
        borderRadius: "var(--radius-pill)",
        font: "var(--type-caption)",
        fontWeight: "var(--weight-medium)",
        ...tones[tone],
        ...style,
      }}
    >
      {dot && (
        <span
          aria-hidden="true"
          style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", opacity: 0.7 }}
        />
      )}
      {children}
    </span>
  );
}
