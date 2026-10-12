"use client";

import { useState } from "react";
import Link from "next/link";

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

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled = false,
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
  const [hover, setHover] = useState(false);
  const [press, setPress] = useState(false);

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
    cursor: disabled ? "not-allowed" : "pointer",
    textDecoration: "none",
    whiteSpace: "nowrap",
    transition: "var(--transition-control), transform var(--dur-fast) var(--ease-standard)",
    transform: press && !disabled ? "scale(var(--press-scale))" : "none",
    ...sizes[size],
    ...variants[variant],
    ...(disabled
      ? { background: "var(--action-disabled)", color: "var(--action-disabled-fg)", borderColor: "var(--action-disabled)" }
      : null),
    ...(disabled ? null : hover ? hoverStyleFor(variant) : null),
    ...style,
  };

  const handlers = {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setPress(false);
    },
    onMouseDown: () => setPress(true),
    onMouseUp: () => setPress(false),
  };

  if (href) {
    return (
      <Link href={href} target={target} rel={rel} className={className} style={computedStyle} {...handlers}>
        {iconLeft}
        {children}
        {iconRight}
      </Link>
    );
  }

  return (
    <button type="button" disabled={disabled} onClick={onClick} className={className} style={computedStyle} {...handlers}>
      {iconLeft}
      {children}
      {iconRight}
    </button>
  );
}
