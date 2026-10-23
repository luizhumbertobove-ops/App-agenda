"use client";

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Icon } from "@/components/vitrine/ds/Icon";

export type PorTela = { celular: number; tablet: number; desktop: number };

const PADRAO: PorTela = { celular: 1.15, tablet: 2.2, desktop: 3.2 };

/**
 * Trilho horizontal com scroll-snap, sem biblioteca. `porTela` diz quantos itens
 * (fracionados) cabem em cada largura: a fração do próximo mostra que dá para deslizar.
 */
export function Carrossel({
  itens,
  rotulo,
  porTela = PADRAO,
}: {
  itens: ReactNode[];
  rotulo: string;
  porTela?: PorTela;
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const c = `car${id}`;
  const trilhoRef = useRef<HTMLDivElement>(null);
  const [ativo, setAtivo] = useState(0);
  const [noInicio, setNoInicio] = useState(true);
  const [noFim, setNoFim] = useState(false);
  const [navegavel, setNavegavel] = useState(false);
  const total = itens.length;

  const atualizar = useCallback(() => {
    const t = trilhoRef.current;
    if (!t) return;
    const max = t.scrollWidth - t.clientWidth;
    const fim = t.scrollLeft >= max - 2;
    setNoInicio(t.scrollLeft <= 2);
    setNoFim(fim);
    setNavegavel(max > 2);

    let indice = 0;
    if (fim) {
      indice = t.children.length - 1;
    } else {
      let menor = Infinity;
      for (let i = 0; i < t.children.length; i++) {
        const distancia = Math.abs((t.children[i] as HTMLElement).offsetLeft - t.scrollLeft);
        if (distancia < menor) {
          menor = distancia;
          indice = i;
        }
      }
    }
    setAtivo(indice);
  }, []);

  useEffect(() => {
    const t = trilhoRef.current;
    if (!t) return;
    let frame = 0;
    const aoRolar = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(atualizar);
    };
    t.addEventListener("scroll", aoRolar, { passive: true });
    const observador = new ResizeObserver(aoRolar);
    observador.observe(t);
    aoRolar();
    return () => {
      t.removeEventListener("scroll", aoRolar);
      observador.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [atualizar, total]);

  function irPara(indice: number) {
    const t = trilhoRef.current;
    const item = t?.children[indice] as HTMLElement | undefined;
    if (!t || !item) return;
    t.scrollTo({ left: item.offsetLeft });
  }

  function aoTeclar(e: KeyboardEvent<HTMLDivElement>) {
    // Só quando o próprio trilho tem o foco: não sequestra setas de campos dentro dos itens.
    if (e.target !== e.currentTarget) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      irPara(Math.min(ativo + 1, total - 1));
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      irPara(Math.max(ativo - 1, 0));
    }
  }

  const css = `
.${c} .${c}-trilho { position: relative; display: flex; gap: var(--space-16); overflow-x: auto; scroll-snap-type: x mandatory; scroll-behavior: smooth; scrollbar-width: none; -ms-overflow-style: none; overscroll-behavior-x: contain; border-radius: var(--radius-card); }
.${c} .${c}-trilho::-webkit-scrollbar { display: none; }
.${c} .${c}-trilho:focus-visible { outline: none; box-shadow: var(--focus-ring); }
.${c} .${c}-item { flex: 0 0 auto; min-width: 0; display: flex; flex-direction: column; scroll-snap-align: start; width: calc((100% - var(--space-16)) / ${porTela.celular}); }
@media (min-width: 640px) { .${c} .${c}-item { width: calc((100% - var(--space-16)) / ${porTela.tablet}); } }
@media (min-width: 1024px) { .${c} .${c}-item { width: calc((100% - var(--space-16)) / ${porTela.desktop}); } }
@media (prefers-reduced-motion: reduce) { .${c} .${c}-trilho { scroll-behavior: auto; } .${c} .${c}-seta:active, .${c} .${c}-ponto:active span { transform: none; } }
.${c} .${c}-controles { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: var(--space-8); margin-top: var(--space-24); }
.${c} .${c}-seta { width: var(--tap-min); height: var(--tap-min); flex: none; display: grid; place-items: center; border-radius: var(--radius-pill); border: 1px solid var(--border-hairline); background: var(--surface-card); color: var(--text-strong); box-shadow: var(--shadow-soft); cursor: pointer; transition: var(--transition-control), transform var(--dur-base) var(--ease-out-soft); }
.${c} .${c}-seta:hover:not(:disabled) { background: var(--action-secondary-hover); }
.${c} .${c}-seta:active:not(:disabled) { transform: scale(var(--press-scale)); transition-duration: var(--dur-instant); }
.${c} .${c}-seta svg { transition: transform var(--dur-base) var(--ease-out-soft); }
.${c} .${c}-seta-ant:hover:not(:disabled) svg { transform: translateX(-2px); }
.${c} .${c}-seta-prox:hover:not(:disabled) svg { transform: translateX(2px); }
.${c} .${c}-seta:focus-visible { outline: none; box-shadow: var(--focus-ring); }
.${c} .${c}-seta:disabled { color: var(--action-disabled-fg); box-shadow: none; cursor: default; }
.${c} .${c}-ponto { width: 24px; height: var(--tap-min); display: grid; place-items: center; background: none; border: 0; padding: 0; cursor: pointer; }
.${c} .${c}-ponto:focus-visible { outline: none; box-shadow: var(--focus-ring); border-radius: var(--radius-pill); }
.${c} .${c}-ponto span { display: block; width: 8px; height: 8px; border-radius: var(--radius-pill); background: var(--border-strong); transition: width var(--dur-base) var(--ease-standard), background-color var(--dur-base) var(--ease-standard), transform var(--dur-fast) var(--ease-standard); }
.${c} .${c}-ponto:active span { transform: scale(.8); }
.${c} .${c}-ponto[aria-current="true"] span { width: 24px; background: var(--action-primary); }
`;

  return (
    <section aria-roledescription="carrossel" aria-label={rotulo} className={c}>
      <style>{css}</style>
      <div
        ref={trilhoRef}
        role="group"
        aria-label={rotulo}
        tabIndex={0}
        onKeyDown={aoTeclar}
        className={`${c}-trilho`}
      >
        {itens.map((item, i) => (
          <div key={i} role="group" aria-roledescription="slide" aria-label={`${i + 1} de ${total}`} className={`${c}-item`}>
            {item}
          </div>
        ))}
      </div>

      {navegavel && total > 1 && (
        <div className={`${c}-controles`}>
          <button
            type="button"
            className={`${c}-seta ${c}-seta-ant`}
            aria-label="Anterior"
            disabled={noInicio}
            onClick={() => irPara(Math.max(ativo - 1, 0))}
          >
            <Icon icon={ChevronLeft} size={18} />
          </button>
          {itens.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`${c}-ponto`}
              aria-label={`Ir para o item ${i + 1}`}
              aria-current={i === ativo ? "true" : undefined}
              onClick={() => irPara(i)}
            >
              <span />
            </button>
          ))}
          <button
            type="button"
            className={`${c}-seta ${c}-seta-prox`}
            aria-label="Próximo"
            disabled={noFim}
            onClick={() => irPara(Math.min(ativo + 1, total - 1))}
          >
            <Icon icon={ChevronRight} size={18} />
          </button>
        </div>
      )}
    </section>
  );
}
