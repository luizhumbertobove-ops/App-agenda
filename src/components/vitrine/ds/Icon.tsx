import { type LucideIcon } from "lucide-react";

export function Icon({
  icon: LucideIconComp,
  size = 20,
  label,
  className,
  style,
  fill = "none",
}: {
  icon: LucideIcon;
  size?: number;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
  /** Só para a nota de avaliação (estrela preenchida). O padrão é linha. */
  fill?: string;
}) {
  return (
    <LucideIconComp
      size={size}
      strokeWidth={1.75}
      fill={fill}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      className={className}
      style={{ flex: "none", color: "currentColor", ...style }}
    />
  );
}
