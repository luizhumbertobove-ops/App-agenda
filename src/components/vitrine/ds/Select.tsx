"use client";

import { useId, useState, type SelectHTMLAttributes } from "react";

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

export function Select({ label, hint, error, id, style, children, ...rest }: Props) {
  const [focus, setFocus] = useState(false);
  const generatedId = useId();
  const fieldId = id || generatedId;
  const borderColor = error ? "var(--status-danger)" : focus ? "var(--border-focus)" : "var(--border-default)";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      {label && (
        <label htmlFor={fieldId} style={{ font: "var(--type-caption)", fontWeight: "var(--weight-medium)", color: "var(--text-body)" }}>
          {label}
        </label>
      )}
      <div style={{ position: "relative", display: "flex" }}>
        <select
          id={fieldId}
          onFocus={(e) => {
            setFocus(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocus(false);
            rest.onBlur?.(e);
          }}
          style={{
            appearance: "none",
            flex: 1,
            height: "var(--control-h-m)",
            padding: "0 36px 0 var(--space-12)",
            background: "var(--surface-card)",
            border: "1px solid " + borderColor,
            borderRadius: "var(--radius-control)",
            font: "var(--type-body)",
            color: "var(--text-strong)",
            outline: "none",
            transition: "var(--transition-control)",
            boxShadow: focus ? "var(--focus-ring)" : "none",
            ...style,
          }}
          {...rest}
        >
          {children}
        </select>
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            right: 14,
            top: "50%",
            transform: "translateY(-60%) rotate(45deg)",
            width: 7,
            height: 7,
            borderRight: "1.5px solid var(--text-muted)",
            borderBottom: "1.5px solid var(--text-muted)",
            pointerEvents: "none",
          }}
        />
      </div>
      {(hint || error) && (
        <span style={{ font: "var(--type-caption)", color: error ? "var(--status-danger)" : "var(--text-muted)" }}>{error || hint}</span>
      )}
    </div>
  );
}
