import { ButtonHTMLAttributes } from "react";

const VARIANTS = {
  primary: "bg-violet-600 text-white hover:bg-violet-700",
  secondary: "border border-gray-200 text-gray-700 hover:bg-gray-50",
  danger: "bg-red-600 text-white hover:bg-red-700",
} as const;

const SIZES = {
  sm: "text-xs px-2 py-1 rounded",
  md: "px-4 py-2 rounded-lg text-sm font-medium",
} as const;

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
};

/** Botão com as variações de cor/tamanho já usadas no admin — layout (largura, flex) fica por conta do `className` de cada chamada. */
export function Button({ variant = "primary", size = "md", className = "", ...props }: Props) {
  return (
    <button
      type="button"
      {...props}
      className={`${SIZES[size]} ${VARIANTS[variant]} disabled:opacity-50 transition-colors ${className}`}
    />
  );
}
