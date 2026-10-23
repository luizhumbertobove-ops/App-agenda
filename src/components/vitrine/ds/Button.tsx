"use client";

import { useState } from "react";
import Link from "next/link";
import { pressTransition, usePress } from "./use-press";

type Variant = "primary" | "secondary" | "ghost" | "inverse";
type Size = "sm" | "md" | "lg";

const sizes: Record<Size, React.CSSProperties> = {
  sm: { height: "var(--control-h-s)", padding: "0 14px", fontSize: "var(--size-body-s)" },
  md: { height: "var(--control-h-m)", padding: "0 20px", fontSize: "var(--size-body-m)" },
  lg: { height: "var(--control-h-l)", padding: "0 28px", fontSize: "var(--size-body-m)" },
};

const variants: Record<Variant, React.CSSProperties> = {
  primary: { background: "var(--action-primary)", color: "var(--action-primary-fg)", border: "1px solid var(--action-primary)" },
  secondary: { background: "var(--surface-card)", color: "var(--action-secondary-fg)", border: "1px solid var(--border-accent)" },
  ghost: { background: "transparent", color: "var(--text-body)", border: "1px solid transparent" },
  inverse: { background: "var(--linen-0)", color: "var(--linen-800)", border: "1px solid var(--linen-0)" },
};

function hoverStyleFor(variant: Variant): React.CSSProperties {
  if (variant === "primary") return { background: "var(--action-primary-hover)", borderColor: "var(--action-primary-hover)" };
  if (variant === "secondary") return { background: "var(--action-secondary-hover)" };
  if (variant === "ghost") return { background: "var(--action-quiet-hover)" };
  return { background: "var(--linen-100)", borderColor: "var(--linen-100)" };
}

// Press escurece um passo a mais no primário; nas outras variantes, o mesmo tom do hover.
function pressStyleFor(variant: Variant): React.CSSProperties {
  if (variant === "primary") return { background: "var(--action-primary-press)", borderColor: "var(--action-primary-press)" };
  return hoverStyleFor(variant);
}

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled = false,
  loading = false,
  iconLeft,
  iconRight,
  href,
  target,
  rel,
  onClick,
  className,
  style,
  children,
}: {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  disabled?: boolean;
  /** Em andamento: bloqueia o botão e mostra um spinner, mantendo as cores da variante. */
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  href?: string;
  target?: string;
  rel?: string;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  // blocked: sem hover/press/foco. grayed: só o disabled comum usa o cinza (loading mantém a variante).
  const blocked = disabled || loading;
  const grayed = disabled && !loading;
  const { hover, press, handlers } = usePress(blocked);
  const [focusVisible, setFocusVisible] = useState(false);
  // Sobe 1px com sombra no hover só nas variantes de destaque.
  const eleva = variant === "primary" || variant === "inverse";

  const computedStyle: React.CSSProperties = {
    display: fullWidth ? "flex" : "inline-flex",
    width: fullWidth ? "100%" : undefined,
    alignItems: "center",
    justifyContent: "center",
    gap: "var(--space-8)",
    fontFamily: "var(--font-sans-body)",
    fontWeight: "var(--weight-medium)",
    letterSpacing: "0.01em",
    borderRadius: "var(--radius-control)",
    cursor: loading ? "progress" : disabled ? "not-allowed" : "pointer",
    textDecoration: "none",
    whiteSpace: "nowrap",
    transition: `var(--transition-control), ${pressTransition(press)}`,
    transform: press && !blocked
      ? "scale(var(--press-scale))"
      : hover && !blocked && eleva
        ? "var(--lift-hover-small)"
        : "none",
    ...sizes[size],
    ...variants[variant],
    ...(grayed
      ? { background: "var(--action-disabled)", color: "var(--action-disabled-fg)", borderColor: "var(--action-disabled)" }
      : null),
    ...(blocked ? null : hover ? hoverStyleFor(variant) : null),
    ...(blocked ? null : press ? pressStyleFor(variant) : null),
    boxShadow: focusVisible && !blocked
      ? "var(--focus-ring)"
      : hover && !blocked && eleva
        ? "var(--shadow-soft)"
        : undefined,
    ...style,
  };

  const handlersComFoco = {
    ...handlers,
    onFocus: (e: React.FocusEvent<HTMLElement>) => setFocusVisible(e.currentTarget.matches(":focus-visible")),
    onBlur: () => setFocusVisible(false),
  };

  const trailingIcon = iconRight ? (
    <span style={{ display: "inline-flex", transition: "transform var(--dur-base) var(--ease-out-soft)", transform: hover && !blocked ? "translateX(4px)" : "none" }}>
      {iconRight}
    </span>
  ) : null;

  const spinner = loading ? <span className="ds-spinner" aria-hidden="true" /> : null;

  if (href) {
    return (
      <Link href={href} target={target} rel={rel} className={className} style={computedStyle} aria-busy={loading || undefined} {...handlersComFoco}>
        {spinner}
        {iconLeft}
        {children}
        {trailingIcon}
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={blocked}
      aria-busy={loading || undefined}
      onClick={onClick}
      className={className}
      style={computedStyle}
      {...handlersComFoco}
    >
      {spinner}
      {iconLeft}
      {children}
      {trailingIcon}
    </button>
  );
}
