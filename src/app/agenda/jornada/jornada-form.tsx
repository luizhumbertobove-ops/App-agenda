"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { apiRequest } from "@/lib/api-client";
import { COMERCIAL, WEEKDAYS, toMinutes, type WorkSchedule } from "@/lib/work-schedule";

export function JornadaForm({ inicial }: { inicial: WorkSchedule }) {
  const router = useRouter();
  const [jornada, setJornada] = useState<WorkSchedule>(inicial);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);

  const invalidos = WEEKDAYS.filter((d) => {
    const h = jornada[d.key];
    return h && toMinutes(h.start) >= toMinutes(h.end);
  });

  function alternar(dia: (typeof WEEKDAYS)[number]["key"]) {
    setAviso(null);
    setJornada((j) => ({ ...j, [dia]: j[dia] ? null : (inicial[dia] ?? COMERCIAL) }));
  }

  function mudarHora(dia: (typeof WEEKDAYS)[number]["key"], campo: "start" | "end", valor: string) {
    setAviso(null);
    setJornada((j) => {
      const atual = j[dia];
      return atual ? { ...j, [dia]: { ...atual, [campo]: valor } } : j;
    });
  }

  async function salvar() {
    setSalvando(true);
    setAviso(null);
    try {
      const r = await apiRequest(
        "/api/settings",
        { method: "PATCH", body: { workSchedule: jornada } },
        "Não foi possível salvar. Confira os horários.",
      );
      if (!r.ok) {
        setAviso({ ok: false, texto: r.error });
        return;
      }
      setAviso({ ok: true, texto: "Jornada salva." });
      router.refresh();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {WEEKDAYS.map((d) => {
          const horas = jornada[d.key];
          const erro = invalidos.some((i) => i.key === d.key);
          return (
            <li key={d.key} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
              <label className="flex min-h-11 flex-1 cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  role="switch"
                  checked={!!horas}
                  onChange={() => alternar(d.key)}
                  className="peer sr-only"
                />
                <span
                  aria-hidden
                  className="relative h-6 w-10 shrink-0 rounded-full bg-gray-300 transition-colors after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:bg-violet-600 peer-checked:after:translate-x-4 peer-focus-visible:ring-2 peer-focus-visible:ring-violet-300"
                />
                <span className="text-[15px] font-medium text-gray-900">{d.label}</span>
              </label>

              {horas ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    aria-label={`${d.label}: início`}
                    value={horas.start}
                    onChange={(e) => mudarHora(d.key, "start", e.target.value)}
                    className="min-h-11 w-28"
                  />
                  <span className="text-sm text-gray-500">às</span>
                  <Input
                    type="time"
                    aria-label={`${d.label}: fim`}
                    value={horas.end}
                    onChange={(e) => mudarHora(d.key, "end", e.target.value)}
                    className="min-h-11 w-28"
                  />
                </div>
              ) : (
                <span className="text-sm text-gray-400">Folga</span>
              )}

              {erro && <p className="w-full text-xs text-red-600">O fim precisa ser depois do início.</p>}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
        {aviso && (
          <p role="status" className={`text-sm ${aviso.ok ? "text-green-700" : "text-red-600"}`}>
            {aviso.texto}
          </p>
        )}
        <Button onClick={salvar} disabled={salvando || invalidos.length > 0} className="sm:min-w-40">
          {salvando ? "Salvando..." : "Salvar jornada"}
        </Button>
      </div>
    </div>
  );
}
