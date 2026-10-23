"use client";

import { useState, type KeyboardEvent, type PointerEvent } from "react";

// Teclado: Espaço e Enter disparam o mesmo retorno de aperto que o ponteiro.
const teclasDeAcao = [" ", "Spacebar", "Enter"];

/**
 * Hover e press por eventos de ponteiro, que também funcionam no toque.
 * Hover só vale para mouse: no toque, o "hover" grudaria depois do toque.
 */
export function usePress(disabled = false) {
  const [hover, setHover] = useState(false);
  const [press, setPress] = useState(false);

  const handlers = {
    onPointerEnter: (e: PointerEvent) => {
      if (e.pointerType === "mouse") setHover(true);
    },
    onPointerLeave: () => {
      setHover(false);
      setPress(false);
    },
    onPointerDown: () => {
      if (!disabled) setPress(true);
    },
    onPointerUp: () => setPress(false),
    onPointerCancel: () => setPress(false),
    onKeyDown: (e: KeyboardEvent) => {
      if (!disabled && teclasDeAcao.includes(e.key)) setPress(true);
    },
    onKeyUp: (e: KeyboardEvent) => {
      if (teclasDeAcao.includes(e.key)) setPress(false);
    },
  };

  return { hover, press, handlers };
}

/** Afunda rápido ao apertar e volta macio ao soltar. */
export function pressTransition(press: boolean): string {
  return press
    ? "transform var(--dur-instant) var(--ease-standard)"
    : "transform var(--dur-base) var(--ease-out-soft)";
}
