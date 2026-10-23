"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Pause, Play } from "lucide-react";
import { Icon } from "@/components/vitrine/ds/Icon";

/**
 * Faixa de avaliações que desliza sozinha, em loop. Pausa no hover, no foco, ao segurar
 * o toque, com "Ler mais" aberto, fora da tela ou pelo botão. Com reduced-motion vira
 * uma lista rolável parada.
 */
export function AvaliacoesLoop({ itens, rotulo }: { itens: ReactNode[]; rotulo: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const c = `avl${id}`;
  const janelaRef = useRef<HTMLDivElement>(null);
  const [pausado, setPausado] = useState(false);
  const [segurando, setSegurando] = useState(false);
  const [fora, setFora] = useState(false);

  // Fora da tela, não anima (economiza bateria).
  useEffect(() => {
    const janela = janelaRef.current;
    if (!janela) return;
    const observador = new IntersectionObserver(([entrada]) => setFora(!entrada.isIntersecting));
    observador.observe(janela);
    return () => observador.disconnect();
  }, []);

  // Repete a lista até ter pelo menos 6 cartões, para não sobrar buraco no loop.
  const grupo = Array.from({ length: Math.ceil(6 / itens.length) }).flatMap(() => itens);

  const css = `
.${c} { position: relative; }
.${c}-janela { overflow: hidden; mask-image: linear-gradient(to right, transparent, black var(--space-40), black calc(100% - var(--space-40)), transparent); -webkit-mask-image: linear-gradient(to right, transparent, black var(--space-40), black calc(100% - var(--space-40)), transparent); }
.${c}-faixa { display: flex; width: max-content; animation: ${c}-passa var(--loop-dur) linear infinite; will-change: transform; }
.${c}-faixa[data-pausado="true"], .${c}-faixa[data-segurando="true"], .${c}-faixa[data-fora="true"] { animation-play-state: paused; }
.${c}-faixa:has([aria-expanded="true"]) { animation-play-state: paused; }
.${c}-janela:focus-within .${c}-faixa { animation-play-state: paused; }
@media (hover: hover) { .${c}-janela:hover .${c}-faixa { animation-play-state: paused; } }
@keyframes ${c}-passa { from { transform: translateX(0); } to { transform: translateX(-50%); } }
.${c}-grupo { display: flex; gap: var(--space-16); padding: 0 var(--space-16) 0 0; margin: 0; list-style: none; }
.${c}-item { flex: none; width: min(320px, 82vw); display: flex; padding: var(--space-8) 0; }
@media (min-width: 1024px) { .${c}-item { width: 360px; } }
.${c}-controles { display: flex; justify-content: center; margin-top: var(--space-16); }
.${c}-seta { width: var(--tap-min); height: var(--tap-min); flex: none; display: grid; place-items: center; border-radius: var(--radius-pill); border: 1px solid var(--border-hairline); background: var(--surface-card); color: var(--text-strong); box-shadow: var(--shadow-soft); cursor: pointer; transition: var(--transition-control), transform var(--dur-base) var(--ease-out-soft); }
.${c}-seta:hover { background: var(--action-secondary-hover); }
.${c}-seta:active { transform: scale(var(--press-scale)); transition-duration: var(--dur-instant); }
.${c}-seta:focus-visible { outline: none; box-shadow: var(--focus-ring); }
@media (prefers-reduced-motion: reduce) {
  .${c}-faixa { animation: none; }
  .${c}-janela { overflow-x: auto; mask-image: none; -webkit-mask-image: none; scroll-snap-type: x mandatory; }
  .${c}-item { scroll-snap-align: start; }
  .${c}-copia { display: none; }
  .${c}-controles { display: none; }
}
`;

  const estilo = { "--loop-dur": `${grupo.length * 9}s` } as CSSProperties;

  const lista = (copia: boolean) => (
    <ul
      className={copia ? `${c}-grupo ${c}-copia` : `${c}-grupo`}
      role={copia ? undefined : "list"}
      aria-hidden={copia ? "true" : undefined}
      inert={copia ? true : undefined}
    >
      {grupo.map((item, i) => (
        <li key={i} className={`${c}-item`}>
          {item}
        </li>
      ))}
    </ul>
  );

  return (
    <section aria-roledescription="carrossel" aria-label={rotulo} className={c}>
      <style>{css}</style>
      <div
        ref={janelaRef}
        className={`${c}-janela`}
        onPointerDown={() => setSegurando(true)}
        onPointerUp={() => setSegurando(false)}
        onPointerCancel={() => setSegurando(false)}
        onPointerLeave={() => setSegurando(false)}
      >
        <div
          className={`${c}-faixa`}
          style={estilo}
          data-pausado={pausado ? "true" : "false"}
          data-segurando={segurando ? "true" : "false"}
          data-fora={fora ? "true" : "false"}
        >
          {lista(false)}
          {lista(true)}
        </div>
      </div>
      <div className={`${c}-controles`}>
        <button
          type="button"
          className={`${c}-seta`}
          aria-pressed={pausado}
          aria-label={pausado ? "Continuar a passagem das avaliações" : "Pausar a passagem das avaliações"}
          onClick={() => setPausado((p) => !p)}
        >
          <Icon icon={pausado ? Play : Pause} size={16} />
        </button>
      </div>
    </section>
  );
}
