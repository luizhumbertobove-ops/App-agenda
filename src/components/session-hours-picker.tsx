"use client";

/** Opções de tempo de sessão: 1 h é a sessão normal; 2 h e 3 h reservam horas seguidas. */
export const SESSION_HOURS = [1, 2, 3] as const;

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
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-gray-700">Tempo da sessão</p>
      <div role="radiogroup" aria-label="Tempo da sessão" className="flex gap-2">
        {SESSION_HOURS.map((h) => (
          <button
            key={h}
            type="button"
            role="radio"
            aria-checked={value === h}
            onClick={() => onChange(h)}
            className={`min-h-11 flex-1 rounded-full border text-sm font-medium transition-colors ${
              value === h
                ? "border-violet-600 bg-violet-600 text-white"
                : "border-gray-200 bg-white text-gray-700 hover:border-violet-300 hover:bg-violet-50"
            }`}
          >
            {h} {h === 1 ? "hora" : "horas"}
          </button>
        ))}
      </div>
      {value > 1 && (
        <p className="mt-1.5 text-xs text-gray-500">Só aparecem os horários com {value} horas seguidas livres.</p>
      )}
    </div>
  );
}
