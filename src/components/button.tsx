import { ButtonHTMLAttributes } from "react";

const VARIANTS = {
  primary: "bg-violet-600 text-white hover:bg-violet-700 active:bg-violet-800",
  secondary: "border border-violet-300 bg-white text-violet-700 hover:bg-violet-50",
  danger: "bg-red-600 text-white hover:bg-red-700",
} as const;

const SIZES = {
  sm: "text-sm px-3 min-h-9 rounded-full",
  md: "px-5 min-h-11 rounded-full text-[15px] font-medium",
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
