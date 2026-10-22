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

    // A página rola dentro do <main overflow-auto> do layout raiz, não na janela:
    // usa o primeiro ancestral rolável e cai na janela se não houver.
    let scroller: HTMLElement | null = header.parentElement;
    while (scroller && !/(auto|scroll)/.test(getComputedStyle(scroller).overflowY)) {
      scroller = scroller.parentElement;
    }
    const target: HTMLElement | Window = scroller ?? window;
    const getY = () => (scroller ? scroller.scrollTop : window.scrollY);

    const onScroll = () => {
      header.dataset.scrolled = getY() > 8 ? "true" : "false";
    };
    onScroll();
    target.addEventListener("scroll", onScroll, { passive: true });
    return () => target.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header ref={ref} className={`ds-header ${className ?? ""}`.trim()} style={style}>
      {children}
    </header>
  );
}
