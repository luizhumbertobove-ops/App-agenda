import { Card } from "./Card";
import { Badge } from "./Badge";

export function ServiceCard({
  name,
  duration,
  price,
  description,
  badge,
  onSelect,
  selected = false,
  interactive,
  highlight,
}: {
  name: string;
  duration?: string;
  price?: string;
  description?: string;
  badge?: string;
  onSelect?: () => void;
  selected?: boolean;
  /** Card dentro de um link/botão: sobe no hover. Padrão: true quando há onSelect. */
  interactive?: boolean;
  /** Destaque da seleção (ex.: motion com layoutId), renderizado atrás do conteúdo do card. */
  highlight?: React.ReactNode;
}) {
  return (
    <Card
      interactive={interactive ?? !!onSelect}
      padding="0"
      onClick={onSelect}
      style={{
        overflow: "hidden",
        position: "relative",
        isolation: "isolate",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        transition: "var(--transition-surface), var(--transition-control)",
        boxShadow: selected && !highlight ? "0 0 0 1.5px var(--action-primary), var(--shadow-lifted)" : undefined,
      }}
    >
      {selected && highlight}
      <div style={{ padding: "var(--space-20)", display: "flex", flexDirection: "column", gap: "var(--space-8)", flex: 1 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "var(--space-12)" }}>
          <h4 style={{ font: "var(--type-heading)", fontFamily: "var(--font-serif-display)", fontWeight: "var(--weight-regular)", fontSize: "var(--size-heading-m)", color: "var(--text-strong)", margin: 0 }}>
            {name}
          </h4>
          {badge && <Badge tone="accent">{badge}</Badge>}
        </div>
        {description && <p style={{ font: "var(--type-body)", fontSize: "var(--size-body-s)", color: "var(--text-muted)" }}>{description}</p>}
        <div style={{ marginTop: "auto", paddingTop: "var(--space-12)", display: "flex", gap: "var(--space-8)", alignItems: "baseline", font: "var(--type-caption)", color: "var(--text-muted)" }}>
          {duration && <span>{duration}</span>}
          {duration && price && <span aria-hidden="true">·</span>}
          {price && <span style={{ color: "var(--text-strong)", fontWeight: "var(--weight-medium)", fontSize: "var(--size-body-s)" }}>{price}</span>}
        </div>
      </div>
    </Card>
  );
}
