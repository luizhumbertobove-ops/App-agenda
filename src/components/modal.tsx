"use client";

import { useEffect, useRef } from "react";

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

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    boxRef.current?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
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
}
