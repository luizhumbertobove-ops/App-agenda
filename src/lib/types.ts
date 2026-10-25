// Formatos que as telas recebem das APIs (serviços, horários livres e clientes).
// Use estes tipos nos formulários em vez de declarar cópias locais.

export type ServiceOption = { id: string; name: string; durationMins: number; price: number };
export type SlotOption = { start: string; end: string; available?: boolean };
export type ClientOption = { id: string; name: string; phone: string };
