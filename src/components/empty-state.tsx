import { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  subtitle,
  action,
  padded = false,
}: {
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  /** Usa `div` com padding em vez de `p` simples — pra quando o pai (tabela/lista) não tem padding próprio. */
  padded?: boolean;
}) {
  if (!icon) {
    return <p className={padded ? "p-8 text-center text-gray-400 text-sm" : "text-gray-400 text-sm"}>{title}</p>;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
      {icon}
      <p className="text-gray-600 font-medium">{title}</p>
      {subtitle && <p className="text-gray-400 text-sm mt-1">{subtitle}</p>}
      {action}
    </div>
  );
}
