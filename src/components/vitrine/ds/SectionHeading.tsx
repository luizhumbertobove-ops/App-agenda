export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  tone = "default",
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  tone?: "default" | "inverse";
  action?: React.ReactNode;
}) {
  const inverse = tone === "inverse";
  return (
    <header
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-12)",
        textAlign: align,
        alignItems: align === "center" ? "center" : "flex-start",
        maxWidth: align === "center" ? "var(--container-text)" : undefined,
        marginInline: align === "center" ? "auto" : undefined,
      }}
    >
      {eyebrow && (
        <span
          style={{
            font: "var(--type-eyebrow)",
            letterSpacing: "var(--tracking-caps)",
            textTransform: "uppercase",
            color: inverse ? "var(--clay-200)" : "var(--text-accent)",
          }}
        >
          {eyebrow}
        </span>
      )}
      <h2 style={{ font: "var(--type-title)", letterSpacing: "var(--tracking-tight)", color: inverse ? "var(--text-inverse)" : "var(--text-strong)" }}>
        {title}
      </h2>
      {description && (
        <p style={{ font: "var(--type-body-lead)", color: inverse ? "var(--linen-200)" : "var(--text-muted)", maxWidth: "var(--measure-narrow)" }}>
          {description}
        </p>
      )}
      {action}
    </header>
  );
}
