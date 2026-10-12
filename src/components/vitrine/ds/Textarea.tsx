"use client";

import { useId, useState, type TextareaHTMLAttributes } from "react";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

export function Textarea({ label, hint, error, rows = 3, id, style, ...rest }: Props) {
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
      <textarea
        id={fieldId}
        rows={rows}
        onFocus={(e) => {
          setFocus(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocus(false);
          rest.onBlur?.(e);
        }}
        style={{
          padding: "var(--space-12)",
          background: "var(--surface-card)",
          border: "1px solid " + borderColor,
          borderRadius: "var(--radius-control)",
          font: "var(--type-body)",
          color: "var(--text-strong)",
          resize: "vertical",
          outline: "none",
          transition: "var(--transition-control)",
          boxShadow: focus ? "var(--focus-ring)" : "none",
          ...style,
        }}
        {...rest}
      />
      {(hint || error) && (
        <span style={{ font: "var(--type-caption)", color: error ? "var(--status-danger)" : "var(--text-muted)" }}>{error || hint}</span>
      )}
    </div>
  );
}
