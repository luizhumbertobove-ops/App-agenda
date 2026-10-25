import { NO_PHONE } from "./constants";

/**
 * Telefone gravado sempre só com dígitos e com o 55 do país, que é o formato
 * que o cadastro e a vitrine já usam. Aceita máscara, "+55" e "0" de operadora.
 * Número com "+" de outro país fica só com os dígitos (sem ganhar 55).
 */
export function normalizePhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  // O sentinela do cadastro sem WhatsApp não é número: fica como está.
  if (digits === NO_PHONE) return NO_PHONE;
  if (raw.trim().startsWith("+") && !digits.startsWith("55")) return digits;
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

/** Telefone já normalizado que dá para gravar: brasileiro com 55 (12 ou 13 dígitos), estrangeiro ou o sentinela. */
export function isValidPhone(normalized: string): boolean {
  if (normalized === NO_PHONE) return true;
  if (normalized.startsWith("55")) return normalized.length === 12 || normalized.length === 13;
  return normalized.length >= 8 && normalized.length <= 15;
}

/**
 * Formas em que um telefone pode estar gravado: com 55 e sem 55.
 * Cadastros antigos foram salvos sem o 55, então a busca precisa conferir as duas.
 * O sentinela nunca entra: "sem WhatsApp" não pode casar com número digitado.
 */
export function phoneVariants(raw: string): string[] {
  const normalized = normalizePhone(raw);
  const withoutCountry =
    normalized.startsWith("55") && normalized.length > 11 ? normalized.slice(2) : normalized;
  return [...new Set([normalized, withoutCountry])].filter((p) => p !== NO_PHONE);
}
