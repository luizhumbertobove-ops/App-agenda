"use client";

import { useId, useState, type InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
  iconLeft?: React.ReactNode;
};

export function Input({ label, hint, error, iconLeft, id, style, ...rest }: Props) {
  const [focus, setFocus] = useState(false);
  const generatedId = useId();
  const inputId = id || generatedId;
  const borderColor = error ? "var(--status-danger)" : focus ? "var(--border-focus)" : "var(--border-default)";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      {label && (
        <label htmlFor={inputId} style={{ font: "var(--type-caption)", fontWeight: "var(--weight-medium)", color: "var(--text-body)" }}>
          {label}
        </label>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-8)",
          height: "var(--control-h-m)",
          padding: "0 var(--space-12)",
          background: "var(--surface-card)",
          border: "1px solid " + borderColor,
          borderRadius: "var(--radius-control)",
          transition: "var(--transition-control)",
          boxShadow: focus ? "var(--focus-ring)" : "none",
          color: "var(--text-subtle)",
        }}
      >
        {iconLeft}
        <input
          id={inputId}
          onFocus={(e) => {
            setFocus(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocus(false);
            rest.onBlur?.(e);
          }}
          style={{
            flex: 1,
            minWidth: 0,
            border: "none",
            outline: "none",
            background: "transparent",
            font: "var(--type-body)",
            color: "var(--text-strong)",
            ...style,
          }}
          {...rest}
        />
      </div>
      {(hint || error) && (
        <span style={{ font: "var(--type-caption)", color: error ? "var(--status-danger)" : "var(--text-muted)" }}>{error || hint}</span>
      )}
    </div>
  );
}
