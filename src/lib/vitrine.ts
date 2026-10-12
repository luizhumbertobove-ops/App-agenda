export const BETO_PHONE = "5516991358579";
export const BETO_PHONE_DISPLAY = "(16) 99135-8579";
export const INSTAGRAM_HANDLE = "@spalhum";
export const INSTAGRAM_URL = "https://www.instagram.com/spalhum";
export const ADDRESS = "Rua Barão do Rio Branco, 964 – Serrana, SP";
export const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  "Rua Barão do Rio Branco, 964, Serrana, SP"
)}`;

export const BUSINESS_START_H = 7;
export const BUSINESS_END_H = 19;

/**
 * Toda sessão reserva 1h de agenda (mesmo as de 50min de atendimento) —
 * os 10min restantes são pra arrumar a sala pro próximo cliente. Por isso
 * a agenda online só oferece horários cheios (7h, 8h, 9h...).
 */
export const SESSION_SLOT_MINUTES = 60;

/** Minutos mínimos de antecedência para uma reserva online (dá tempo do Beto se preparar). */
export const MIN_LEAD_MINUTES = 120;

/** A agenda online só funciona de segunda (1) a sexta (5) — dado um "YYYY-MM-DD". */
export function isBusinessDay(dateStr: string): boolean {
  const [year, month, day] = dateStr.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return weekday >= 1 && weekday <= 5;
}

export function whatsappLink(message: string, phone: string = BETO_PHONE) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
