/**
 * Telefone gravado sempre só com dígitos e com o 55 do país, que é o formato
 * que o cadastro e a vitrine já usam. Aceita máscara, "+55" e "0" de operadora.
 */
export function normalizePhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

/**
 * Formas em que um telefone pode estar gravado: com 55 e sem 55.
 * Cadastros antigos foram salvos sem o 55, então a busca precisa conferir as duas.
 */
export function phoneVariants(raw: string): string[] {
  const normalized = normalizePhone(raw);
  const withoutCountry =
    normalized.startsWith("55") && normalized.length > 11 ? normalized.slice(2) : normalized;
  return [...new Set([normalized, withoutCountry])];
}
