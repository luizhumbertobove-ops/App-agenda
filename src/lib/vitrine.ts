export const BETO_PHONE = "5516991358579";
export const BETO_PHONE_DISPLAY = "(16) 99135-8579";
export const INSTAGRAM_HANDLE = "@spalhum";
export const INSTAGRAM_URL = "https://www.instagram.com/spalhum";
export const ADDRESS = "Rua Barão do Rio Branco, 964 – Serrana, SP";
export const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  "Rua Barão do Rio Branco, 964, Serrana, SP"
)}`;

/**
 * Toda sessão reserva 1h de agenda (mesmo as de 50min de atendimento) —
 * os 10min restantes são pra arrumar a sala pro próximo cliente. Por isso
 * a agenda online só oferece horários de hora em hora a partir do início da jornada.
 */
export const SESSION_SLOT_MINUTES = 60;

/** Minutos mínimos de antecedência para uma reserva online (dá tempo do Beto se preparar). */
export const MIN_LEAD_MINUTES = 120;

/**
 * A agenda online só funciona nos dias da jornada do Beto — dado um "YYYY-MM-DD".
 * `workDays` usa o dia da semana do JavaScript ("0" = domingo); vem de getWorkSchedule().
 */
export function isBusinessDay(dateStr: string, workDays: string[]): boolean {
  const [year, month, day] = dateStr.split("-").map(Number);
  return workDays.includes(String(new Date(Date.UTC(year, month - 1, day)).getUTCDay()));
}

export function whatsappLink(message: string, phone: string = BETO_PHONE) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
