"use client";

// Foto com parallax suave ao rolar. Preenche o contêiner pai (position relative + overflow hidden).
// A imagem é um pouco maior que o contêiner para o deslocamento não mostrar borda.
// Com prefers-reduced-motion, a foto fica parada.

import Image from "next/image";
import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { useScrollContainer } from "@/components/vitrine/motion/use-scroll-container";
import { useVitrineMotion } from "@/components/vitrine/motion/provider";

export type ParallaxPhotoProps = {
  src: string;
  alt: string;
  /** "hero": desce mais e dá leve zoom. "soft": só um deslocamento discreto. */
  strength?: "hero" | "soft";
  priority?: boolean;
};

export function ParallaxPhoto({ src, alt, strength = "soft", priority }: ParallaxPhotoProps) {
  const { reduce } = useVitrineMotion();
  const ref = useRef<HTMLDivElement>(null);
  const container = useScrollContainer(ref);

  const hero = strength === "hero";
  const { scrollYProgress } = useScroll({
    target: ref,
    container,
    offset: hero ? ["start start", "end start"] : ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], hero ? ["0%", "12%"] : ["-4%", "4%"]);
  const scale = useTransform(scrollYProgress, [0, 1], [1.04, 1]);

  const inset = hero ? "-6%" : "-4%";

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute left-0 right-0"
        style={reduce ? { top: inset, bottom: inset } : { top: inset, bottom: inset, y, ...(hero ? { scale } : {}) }}
      >
        <Image src={src} alt={alt} fill priority={priority} className="object-cover" />
      </motion.div>
    </div>
  );
}
