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
}: {
  name: string;
  duration?: string;
  price?: string;
  description?: string;
  badge?: string;
  onSelect?: () => void;
  selected?: boolean;
}) {
  return (
    <Card
      interactive={!!onSelect}
      padding="0"
      onClick={onSelect}
      style={{
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        boxShadow: selected ? "0 0 0 1.5px var(--action-primary), var(--shadow-lifted)" : undefined,
      }}
    >
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
