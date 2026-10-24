"use client";

// Header da vitrine com sombra suave quando a página rola.
// Marca data-scrolled="true" a partir de 8px de rolagem (CSS em bove-ds.css: .ds-header).

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

export type HeaderShadowProps = {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
};

export function HeaderShadow({ children, className, style }: HeaderShadowProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const header = ref.current;
    if (!header) return;

    const onScroll = () => {
      header.dataset.scrolled = window.scrollY > 8 ? "true" : "false";
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header ref={ref} className={`ds-header ${className ?? ""}`.trim()} style={style}>
      {children}
    </header>
  );
}
