import axios from "axios";
import { interpolate } from "./template";

const api = axios.create({
  baseURL: process.env.EVOLUTION_API_URL,
  headers: {
    apikey: process.env.EVOLUTION_API_KEY,
    "Content-Type": "application/json",
  },
});

const INSTANCE = process.env.EVOLUTION_INSTANCE ?? "beto";

function formatPhone(phone: string): string {
  // Remove tudo que não é número e garante código do país
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55")) return digits;
  return `55${digits}`;
}

export async function sendText(phone: string, message: string) {
  const number = formatPhone(phone);
  const res = await api.post(`/message/sendText/${INSTANCE}`, {
    number,
    text: message,
  });
  return res.data;
}

export const DEFAULT_CONFIRMATION_TEMPLATE =
  `Oi, {{nome}}! Passando para confirmar seu horário *amanhã* às *{{hora}}*.\n\n` +
  `Responda *SIM* para confirmar ou *NÃO* se precisar remarcar.\n\n` +
  `Até lá, Humberto.`;

export const DEFAULT_PAYMENT_TEMPLATE =
  `Oi, {{nome}}, obrigado pela visita.\n\n` +
  `Segue o Pix de *R$ {{valor}}*:\n\n` +
  `\`{{pix}}\`\n\n` +
  `Qualquer dúvida, é só me chamar.`;

export const DEFAULT_REENGAGEMENT_TEMPLATE =
  `Oi, {{nome}}, tudo bem?\n\n` +
  `Faz um tempinho que você não vem. Que tal reservar uma sessão esta semana?\n\n` +
  `Atendo de segunda a sexta, das 7h às 19h.`;

export function buildConfirmationMessage(clientName: string, date: Date, template?: string | null): string {
  const hora = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
  return interpolate(template || DEFAULT_CONFIRMATION_TEMPLATE, { nome: clientName, hora });
}

export function buildPaymentMessage(clientName: string, amount: number, pixCode: string, template?: string | null): string {
  return interpolate(template || DEFAULT_PAYMENT_TEMPLATE, {
    nome: clientName,
    valor: amount.toFixed(2).replace(".", ","),
    pix: pixCode,
  });
}

export function buildReengagementMessage(clientName: string, template?: string | null): string {
  return interpolate(template || DEFAULT_REENGAGEMENT_TEMPLATE, { nome: clientName });
}

export const DEFAULT_NO_SHOW_TEMPLATE =
  `Oi, {{nome}}, senti sua falta hoje.\n\n` +
  `Quando quiser remarcar, é só me chamar.`;

export function buildNoShowMessage(clientName: string, template?: string | null): string {
  return interpolate(template || DEFAULT_NO_SHOW_TEMPLATE, { nome: clientName });
}
