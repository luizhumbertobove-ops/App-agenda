"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

/** Modais abertos, do mais antigo ao mais novo: o Esc fecha só o de cima. */
const openStack: symbol[] = [];

const noopSubscribe = () => () => {};

const MAX_WIDTH = {
  sm: "md:max-w-sm",
  md: "md:max-w-md",
  lg: "md:max-w-lg",
} as const;

export function Modal({
  onClose,
  maxWidth = "md",
  className = "",
  children,
}: {
  onClose: () => void;
  maxWidth?: keyof typeof MAX_WIDTH;
  className?: string;
  children: React.ReactNode;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  // onClose costuma ser uma função nova a cada render; guardada em ref para o efeito
  // abaixo rodar uma vez só (senão o foco voltava para a caixa a cada tecla digitada).
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const token = Symbol("modal");
    openStack.push(token);
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && openStack[openStack.length - 1] === token) onCloseRef.current();
    }
    document.addEventListener("keydown", onKeyDown);
    boxRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      openStack.splice(openStack.indexOf(token), 1);
    };
  }, []);

  // No navegador o modal vai direto para o <body>: assim um modal aberto de dentro de
  // outro (ex.: Editar a partir da folha do atendimento) não fica preso na caixa do primeiro.
  // No servidor (e na hidratação) renderiza no lugar, para o HTML bater.
  const inBrowser = useSyncExternalStore(noopSubscribe, () => true, () => false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const overlay = (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-gray-950/50 transition-opacity duration-200 ease-out starting:opacity-0 motion-reduce:transition-none md:items-center md:p-4"
    >
      <div
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={`w-full bg-gray-50 md:bg-white rounded-t-[28px] md:rounded-2xl shadow-xl max-h-[90dvh] md:max-h-[90vh] overflow-y-auto pb-[env(safe-area-inset-bottom)] outline-none transition duration-200 ease-out starting:translate-y-full md:starting:translate-y-0 md:starting:opacity-0 motion-reduce:transition-none ${MAX_WIDTH[maxWidth]} ${className}`}
      >
        <div
          aria-hidden="true"
          className="mx-auto mt-2.5 mb-1 h-1 w-10 rounded-full bg-gray-300 md:hidden"
        />
        {children}
      </div>
    </div>
  );

  return inBrowser ? createPortal(overlay, document.body) : overlay;
}
