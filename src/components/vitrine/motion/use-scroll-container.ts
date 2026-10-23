"use client";

// A vitrine rola dentro do <main overflow-auto> do layout raiz, não na janela.
// Este hook devolve a ref do primeiro ancestral rolável de `target` (ou null = janela),
// para passar como `container` ao useScroll do Motion.

import { useLayoutEffect, useRef, type RefObject } from "react";

export function useScrollContainer<T extends HTMLElement>(target: RefObject<T | null>): RefObject<HTMLElement | null> {
  const container = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    let el: HTMLElement | null = target.current?.parentElement ?? null;
    while (el && !/(auto|scroll)/.test(getComputedStyle(el).overflowY)) {
      el = el.parentElement;
    }
    container.current = el;
  }, [target]);

  return container;
}
