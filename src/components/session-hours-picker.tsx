"use client";

import { Minus, Plus } from "lucide-react";

/** Até 10 horas seguidas (ex.: um bloco de 5 h para atender uma empresa). */
export const MAX_SESSION_HOURS = 10;

/** Duração em minutos: 1 h usa a duração do serviço (ex.: 50 min); mais horas ocupam as horas inteiras. */
export function sessionMinutes(hours: number, serviceMinutes: number): number {
  return hours === 1 ? serviceMinutes : hours * 60;
}

export function SessionHoursPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (hours: number) => void;
}) {
  const btn =
    "flex size-11 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40";

  return (
    <div>
      <p id="tempo-sessao" className="mb-1.5 text-sm font-medium text-gray-700">
        Tempo da sessão
      </p>
      <div className="flex items-center gap-3" role="group" aria-labelledby="tempo-sessao">
        <button
          type="button"
          onClick={() => onChange(value - 1)}
          disabled={value <= 1}
          aria-label="Menos uma hora"
          className={btn}
        >
          <Minus size={16} aria-hidden />
        </button>
        <output aria-live="polite" className="min-w-24 text-center text-[15px] font-medium text-gray-900">
          {value} {value === 1 ? "hora" : "horas"}
        </output>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          disabled={value >= MAX_SESSION_HOURS}
          aria-label="Mais uma hora"
          className={btn}
        >
          <Plus size={16} aria-hidden />
        </button>
      </div>
      {value > 1 && (
        <p className="mt-1.5 text-xs text-gray-500">Só aparecem os horários com {value} horas seguidas livres.</p>
      )}
    </div>
  );
}
