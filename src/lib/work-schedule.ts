import { z } from "zod";
import { businessHoursRangeBR } from "./date";

/** Dia da semana no padrão do JavaScript: "0" = domingo ... "6" = sábado. */
export type Weekday = "0" | "1" | "2" | "3" | "4" | "5" | "6";
export type DayHours = { start: string; end: string };
/** Dia com `null` = folga. */
export type WorkSchedule = Record<Weekday, DayHours | null>;

/** Ordem de exibição: a semana do Beto começa na segunda. */
export const WEEKDAYS: { key: Weekday; label: string }[] = [
  { key: "1", label: "Segunda" },
  { key: "2", label: "Terça" },
  { key: "3", label: "Quarta" },
  { key: "4", label: "Quinta" },
  { key: "5", label: "Sexta" },
  { key: "6", label: "Sábado" },
  { key: "0", label: "Domingo" },
];

/** Horário comercial padrão (também usado para encaixes em dia de folga). */
export const COMERCIAL: DayHours = { start: "07:00", end: "19:00" };

/** Vale enquanto o Beto não salvar a própria jornada (é o horário que a vitrine sempre anunciou). */
export const DEFAULT_WORK_SCHEDULE: WorkSchedule = {
  "0": null,
  "1": COMERCIAL,
  "2": COMERCIAL,
  "3": COMERCIAL,
  "4": COMERCIAL,
  "5": COMERCIAL,
  "6": null,
};

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use o formato HH:MM");

const dayHoursSchema = z
  .object({ start: hhmm, end: hhmm })
  .refine((d) => toMinutes(d.start) < toMinutes(d.end), "O fim precisa ser depois do início");

export const workScheduleSchema = z.object({
  "0": dayHoursSchema.nullable(),
  "1": dayHoursSchema.nullable(),
  "2": dayHoursSchema.nullable(),
  "3": dayHoursSchema.nullable(),
  "4": dayHoursSchema.nullable(),
  "5": dayHoursSchema.nullable(),
  "6": dayHoursSchema.nullable(),
});

export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function parseWorkSchedule(value: unknown): WorkSchedule {
  const parsed = workScheduleSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_WORK_SCHEDULE;
}

/** Dia da semana de um "YYYY-MM-DD". */
export function weekdayOf(dateStr: string): Weekday {
  const [year, month, day] = dateStr.split("-").map(Number);
  return String(new Date(Date.UTC(year, month - 1, day)).getUTCDay()) as Weekday;
}

export function hoursForDate(schedule: WorkSchedule, dateStr: string): DayHours | null {
  return schedule[weekdayOf(dateStr)];
}

/** Início e fim da jornada nesse dia (horário de Brasília), ou null se for folga. */
export function workRangeForDate(
  schedule: WorkSchedule,
  dateStr: string
): { start: Date; end: Date } | null {
  const hours = hoursForDate(schedule, dateStr);
  return hours ? rangeForHours(dateStr, hours) : null;
}

/** Converte um "HH:MM–HH:MM" de um dia em instantes (horário de Brasília). */
export function rangeForHours(dateStr: string, hours: DayHours): { start: Date; end: Date } {
  const { start: midnight } = businessHoursRangeBR(dateStr, 0, 0);
  const base = midnight.getTime();
  return {
    start: new Date(base + toMinutes(hours.start) * 60_000),
    end: new Date(base + toMinutes(hours.end) * 60_000),
  };
}
