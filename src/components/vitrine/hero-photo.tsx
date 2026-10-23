"use client";

// Foto do hero da vitrine: entra com .ds-enter (CSS) e tem parallax forte ao rolar.

import type { CSSProperties } from "react";
import { ParallaxPhoto } from "@/components/vitrine/parallax-photo";

export type HeroPhotoProps = {
  src: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
};

export function HeroPhoto({ src, alt, className, style }: HeroPhotoProps) {
  return (
    <div
      className={`ds-enter ${className ?? ""}`.trim()}
      style={{ ...style, ["--reveal-delay" as string]: "120ms" } as CSSProperties}
    >
      <ParallaxPhoto src={src} alt={alt} strength="hero" priority />
    </div>
  );
}
