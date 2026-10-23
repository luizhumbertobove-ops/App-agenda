"use client";

// Configuração de movimento da vitrine. Com prefers-reduced-motion (do sistema),
// os componentes Motion vão direto ao estado final, sem animar.

import { useSyncExternalStore, type ReactNode } from "react";
import { MotionConfig, type Transition } from "motion/react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

export function VitrineMotion({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

export function useVitrineMotion() {
  // O servidor não conhece a preferência: na hidratação vale false (igual ao HTML do servidor)
  // e logo depois o valor real do aparelho. Evita erro de hidratação.
  const reduce = useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
  // Com reduce, a transição vira instantânea (duration 0) em vez de ser animada.
  const t = (transition: Transition): Transition => (reduce ? { duration: 0 } : transition);
  return { reduce, t };
}
