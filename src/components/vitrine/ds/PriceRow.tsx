export function PriceRow({ name, meta, price, note }: { name: string; meta?: string; price: string; note?: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: "var(--space-16)",
        padding: "var(--space-16) 0",
        borderBottom: "1px solid var(--border-hairline)",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ font: "var(--type-body)", color: "var(--text-strong)" }}>{name}</span>
        {meta && <span style={{ font: "var(--type-caption)", color: "var(--text-muted)" }}>{meta}</span>}
      </div>
      <span aria-hidden="true" style={{ flex: 1, borderBottom: "1px dotted var(--border-default)", transform: "translateY(-4px)" }} />
      <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ font: "var(--type-body)", fontWeight: "var(--weight-medium)", color: "var(--text-strong)", fontVariantNumeric: "tabular-nums" }}>
          {price}
        </span>
        {note && <span style={{ font: "var(--type-caption)", color: "var(--text-muted)" }}>{note}</span>}
      </div>
    </div>
  );
}
