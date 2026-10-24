"use client";

import { useEffect, useRef } from "react";

/**
 * Vídeo em loop, sem som, dentro do carrossel da vitrine.
 * Toca só quando pelo menos metade está visível; com "reduzir movimento" fica parado no primeiro quadro.
 */
export function VideoLoop({ src, alt }: { src: string; alt?: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduzir || typeof IntersectionObserver === "undefined") return;

    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting && entrada.intersectionRatio >= 0.5) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: [0, 0.5, 1] },
    );

    observador.observe(video);
    return () => observador.disconnect();
  }, []);

  return (
    <video
      ref={ref}
      src={`${src}#t=0.1`}
      muted
      loop
      playsInline
      preload="metadata"
      aria-label={alt || "Vídeo do consultório"}
      className="absolute inset-0 size-full object-cover"
    />
  );
}
