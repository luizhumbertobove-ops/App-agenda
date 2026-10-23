"use client";

// Configuração de movimento da vitrine. Com prefers-reduced-motion (do sistema),
// os componentes Motion vão direto ao estado final, sem animar.

import type { ReactNode } from "react";
import { MotionConfig, useReducedMotion, type Transition } from "motion/react";

export function VitrineMotion({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

export function useVitrineMotion() {
  const reduce = useReducedMotion() === true;
  // Com reduce, a transição vira instantânea (duration 0) em vez de ser animada.
  const t = (transition: Transition): Transition => (reduce ? { duration: 0 } : transition);
  return { reduce, t };
}
