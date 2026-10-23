import { Check } from "lucide-react";
import { Card } from "./Card";
import { Badge } from "./Badge";
import { Icon } from "./Icon";

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
        // Sem transition aqui: o Card cuida do retorno do press e do hover.
        ...(selected && !highlight ? { boxShadow: "0 0 0 1.5px var(--action-primary), var(--shadow-lifted)" } : null),
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
          {selected && (
            <span
              className="ds-pop"
              aria-hidden="true"
              style={{ marginLeft: "auto", alignSelf: "center", flex: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: "var(--radius-pill)", background: "var(--action-primary)", color: "var(--action-primary-fg)" }}
            >
              <Icon icon={Check} size={14} />
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
