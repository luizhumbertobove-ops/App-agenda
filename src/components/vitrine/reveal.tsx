"use client";

// Entrada suave ao rolar da vitrine. A Galeria e as Avaliações devem usar <Reveal>
// (ou a classe .ds-reveal dentro de um ancestral .bove-ds com a classe js-reveal).
// Sem JS, nada fica oculto: o estado inicial só vale depois que o JS marca .js-reveal.

import { useLayoutEffect, useRef, type CSSProperties, type ElementType, type ReactNode } from "react";

export type RevealProps = {
  children?: ReactNode;
  /** Posição na lista; o atraso é delay * 60ms, com teto de 5 itens escalonados. */
  delay?: number;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
};

export function Reveal({ children, delay = 0, as = "div", className, style }: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  // useLayoutEffect: decide antes da pintura, para o que já está na tela não piscar.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Já visível ao montar (veio renderizado do servidor): fica como está, sem esconder.
    if (el.getBoundingClientRect().top < window.innerHeight) {
      el.classList.add("is-visible");
      return;
    }

    el.closest(".bove-ds")?.classList.add("js-reveal");

    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("is-visible");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.classList.add("is-visible");
            observer.disconnect();
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const revealStyle = {
    "--reveal-delay": `${Math.min(delay, 5) * 60}ms`,
    ...style,
  } as CSSProperties;

  const Tag: ElementType = as;

  return (
    <Tag ref={ref} className={["ds-reveal", className].filter(Boolean).join(" ")} style={revealStyle}>
      {children}
    </Tag>
  );
}
