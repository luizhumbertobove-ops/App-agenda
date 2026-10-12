import { type LucideIcon } from "lucide-react";

export function Icon({
  icon: LucideIconComp,
  size = 20,
  label,
  className,
  style,
}: {
  icon: LucideIcon;
  size?: number;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <LucideIconComp
      size={size}
      strokeWidth={1.75}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      className={className}
      style={{ flex: "none", color: "currentColor", ...style }}
    />
  );
}
