"use client";

import { useEffect, useRef } from "react";

const MAX_WIDTH = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
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

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    boxRef.current?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={`bg-white rounded-2xl shadow-xl w-full ${MAX_WIDTH[maxWidth]} outline-none ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
