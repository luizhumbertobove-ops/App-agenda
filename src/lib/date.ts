const BR_OFFSET_MS = 3 * 60 * 60 * 1000;

/** Início do dia atual (00:00 horário de Brasília), retornado como Date UTC equivalente. */
export function startOfTodayBR(): Date {
  const brNow = new Date(Date.now() - BR_OFFSET_MS);
  return new Date(
    Date.UTC(brNow.getUTCFullYear(), brNow.getUTCMonth(), brNow.getUTCDate(), 0, 0, 0, 0) +
      BR_OFFSET_MS
  );
}

/** Fim do dia atual (23:59:59.999 horário de Brasília). */
export function endOfTodayBR(): Date {
  return new Date(startOfTodayBR().getTime() + 24 * 60 * 60 * 1000 - 1);
}

/** Data/hora atual ajustada para horário de Brasília (campos UTC = campos BR). */
export function nowBR(): Date {
  return new Date(Date.now() - BR_OFFSET_MS);
}

/** Formata uma data no padrão "Quinta-feira, 11 de Junho" usando horário de Brasília. */
export function formatLongDateBR(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

/** Formata apenas o horário no padrão "08:00" usando horário de Brasília. */
export function formatTimeBR(date: Date): string {
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

/** Formata data no padrão "16/06/2026" usando horário de Brasília. */
export function formatDateBR(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  });
}

/** Início/fim de um intervalo de horário comercial (horário de Brasília) para uma data "YYYY-MM-DD". */
export function businessHoursRangeBR(
  dateStr: string,
  startHour: number,
  endHour: number
): { start: Date; end: Date } {
  const [year, month, day] = dateStr.split("-").map(Number);
  const midnightBrAsUTC = Date.UTC(year, month - 1, day, 0, 0, 0) + BR_OFFSET_MS;
  return {
    start: new Date(midnightBrAsUTC + startHour * 60 * 60 * 1000),
    end: new Date(midnightBrAsUTC + endHour * 60 * 60 * 1000),
  };
}
