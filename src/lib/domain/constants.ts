// Cobrança em aberto entra no "A receber".
export const OPEN_PAYMENT_STATUSES = ["PENDING", "SENT", "OVERDUE"] as const;

export function isOpenPayment(status: string): boolean {
  return (OPEN_PAYMENT_STATUSES as readonly string[]).includes(status);
}

// Telefone-sentinela do cadastro sem WhatsApp.
export const NO_PHONE = "00000000000";

/** Verifica se o telefone é válido para WhatsApp (não nulo, não vazio e não a sentinela). */
export function hasWhatsapp(phone: string | null | undefined): boolean {
  return !!phone && phone.trim() !== "" && phone !== NO_PHONE;
}
