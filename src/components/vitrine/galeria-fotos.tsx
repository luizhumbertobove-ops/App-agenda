"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Carrossel } from "@/components/vitrine/carrossel";
import { Lightbox, type FotoLightbox } from "@/components/vitrine/lightbox";

/** Carrossel da galeria; clicar numa foto abre o lightbox. */
export function GaleriaFotos({ fotos }: { fotos: FotoLightbox[] }) {
  const [indice, setIndice] = useState<number | null>(null);
  const disparoRef = useRef<HTMLButtonElement | null>(null);

  return (
    <>
      <Carrossel
        rotulo="Fotos do consultório"
        porTela={{ celular: 1.15, tablet: 2.2, desktop: 3.2 }}
        itens={fotos.map((foto, i) => (
          <button
            key={foto.id}
            type="button"
            onClick={(e) => {
              disparoRef.current = e.currentTarget;
              setIndice(i);
            }}
            aria-label={`Ampliar foto ${i + 1} de ${fotos.length}`}
            className="group relative block w-full aspect-[4/5] overflow-hidden cursor-zoom-in"
            style={{ borderRadius: "var(--radius-image)", boxShadow: "var(--shadow-inset-hairline)" }}
          >
            <Image
              src={foto.url}
              alt={foto.alt || "Foto do consultório Spaço Lhum"}
              fill
              sizes="(min-width: 1024px) 340px, (min-width: 640px) 45vw, 80vw"
              className="object-cover transition-transform group-hover:motion-safe:scale-[1.03]"
              style={{ filter: "saturate(.92)", transitionDuration: "var(--dur-slow)", transitionTimingFunction: "var(--ease-out-soft)" }}
            />
          </button>
        ))}
      />
      <Lightbox
        fotos={fotos}
        indice={indice}
        onMudar={setIndice}
        onFechar={() => {
          setIndice(null);
          disparoRef.current?.focus();
        }}
      />
    </>
  );
}
