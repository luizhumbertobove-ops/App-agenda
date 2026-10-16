"use client";

/** Chave "Atendimento em parceria": cliente da outra massoterapeuta, sem cadastro aqui. */
export function PartnerToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="mb-4 flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-gray-900">Atendimento em parceria</span>
        <span className="block text-xs text-gray-500">Cliente da outra massoterapeuta: só o nome, sem cadastro.</span>
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className="relative h-6 w-10 shrink-0 rounded-full bg-gray-300 transition-colors after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:bg-violet-600 peer-checked:after:translate-x-4 peer-focus-visible:ring-2 peer-focus-visible:ring-violet-300"
      />
    </label>
  );
}
