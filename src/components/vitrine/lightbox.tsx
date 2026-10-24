"use client";

import { useEffect, useId, useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Icon } from "@/components/vitrine/ds/Icon";

export type FotoLightbox = { id: string; url: string; alt: string; type?: "IMAGE" | "VIDEO" };

/**
 * Visualizador de fotos com <dialog> nativo (showModal: foco preso, Esc fecha).
 * Controlado pelo pai: `indice` null = fechado.
 */
export function Lightbox({
  fotos,
  indice,
  onMudar,
  onFechar,
}: {
  fotos: FotoLightbox[];
  indice: number | null;
  onMudar: (indice: number) => void;
  onFechar: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const c = `lb${id}`;
  const aberto = indice !== null;
  const foto = indice !== null ? fotos[indice] : undefined;

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (aberto && !d.open) d.showModal();
  }, [aberto]);

  function fechar() {
    dialogRef.current?.close();
  }

  function aoTeclar(e: React.KeyboardEvent<HTMLDialogElement>) {
    if (indice === null) return;
    if (e.key === "ArrowRight" && indice < fotos.length - 1) {
      e.preventDefault();
      onMudar(indice + 1);
    } else if (e.key === "ArrowLeft" && indice > 0) {
      e.preventDefault();
      onMudar(indice - 1);
    }
  }

  const css = `
.${c} { padding: 0; margin: 0; border: 0; width: 100%; height: 100%; max-width: none; max-height: none; background: transparent; color: var(--linen-0); }
.${c}:not([open]) { display: none; }
.${c}::backdrop { background: var(--surface-overlay); }
.${c}[open] { animation: ${c}-entrada var(--dur-base) var(--ease-out-soft); }
.${c}[open]::backdrop { animation: ${c}-fundo var(--dur-base) var(--ease-standard); }
@keyframes ${c}-entrada { from { opacity: 0; transform: scale(.98); } to { opacity: 1; transform: none; } }
@keyframes ${c}-fundo { from { opacity: 0; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .${c}[open], .${c}[open]::backdrop { animation: none; } }
.${c} .${c}-barra { display: flex; align-items: center; justify-content: space-between; gap: var(--space-16); padding: var(--space-16) var(--gutter-inline); font: var(--type-caption); }
.${c} .${c}-botao { width: var(--tap-min); height: var(--tap-min); flex: none; display: grid; place-items: center; border-radius: var(--radius-pill); border: 1px solid var(--border-hairline); background: var(--surface-card); color: var(--text-strong); box-shadow: var(--shadow-soft); cursor: pointer; transition: var(--transition-control); }
.${c} .${c}-botao:hover:not(:disabled) { background: var(--action-secondary-hover); }
.${c} .${c}-botao:focus-visible { outline: none; box-shadow: var(--focus-ring); }
.${c} .${c}-botao:disabled { color: var(--action-disabled-fg); box-shadow: none; cursor: default; }
.${c} .${c}-corpo { flex: 1; min-height: 0; display: flex; align-items: stretch; gap: var(--space-8); padding: 0 var(--space-16) var(--space-24); }
.${c} .${c}-imagem { position: relative; flex: 1; min-width: 0; }
`;

  return (
    <dialog
      ref={dialogRef}
      className={c}
      aria-label={foto ? `Foto ${indice! + 1} de ${fotos.length}` : "Foto ampliada"}
      onClose={onFechar}
      onKeyDown={aoTeclar}
    >
      <style>{css}</style>
      {foto && indice !== null && (
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <div className={`${c}-barra`}>
            <span aria-live="polite" style={{ color: "var(--linen-0)" }}>
              {indice + 1} de {fotos.length}
            </span>
            <button type="button" className={`${c}-botao`} aria-label="Fechar" onClick={fechar}>
              <Icon icon={X} size={18} />
            </button>
          </div>
          <div className={`${c}-corpo`}>
            <button
              type="button"
              className={`${c}-botao`}
              aria-label="Foto anterior"
              disabled={indice === 0}
              onClick={() => onMudar(indice - 1)}
              style={{ alignSelf: "center" }}
            >
              <Icon icon={ChevronLeft} size={18} />
            </button>
            <div className={`${c}-imagem`}>
              {foto.type === "VIDEO" ? (
                <video
                  key={foto.id}
                  src={foto.url}
                  autoPlay
                  muted
                  loop
                  playsInline
                  controls
                  aria-label={foto.alt || "Vídeo do consultório"}
                  className="absolute inset-0 size-full object-contain"
                />
              ) : (
                <Image
                  key={foto.id}
                  src={foto.url}
                  alt={foto.alt || "Foto do consultório Spaço Lhum"}
                  fill
                  sizes="100vw"
                  className="object-contain"
                />
              )}
            </div>
            <button
              type="button"
              className={`${c}-botao`}
              aria-label="Próxima foto"
              disabled={indice === fotos.length - 1}
              onClick={() => onMudar(indice + 1)}
              style={{ alignSelf: "center" }}
            >
              <Icon icon={ChevronRight} size={18} />
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
