// Espelho em JS dos tokens de movimento de bove-ds.css, para usar no Motion.
// Mantenha os valores alinhados com --ease-* e --dur-* do CSS.

export const ease = { standard: [0.32, 0.72, 0.24, 1], outSoft: [0.16, 0.84, 0.44, 1] } as const;
export const dur = { fast: 0.16, base: 0.24, slow: 0.42, enter: 0.64 } as const;
export const spring = { type: "spring", bounce: 0, duration: 0.5 } as const;
