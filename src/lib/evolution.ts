import axios from "axios";
import { interpolate } from "./template";
import { formatTimeBR } from "./date";

const api = axios.create({
  baseURL: process.env.EVOLUTION_API_URL,
  // Sem limite, um servidor fora do ar segura a tela até a rede desistir (minutos).
  timeout: 15_000,
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

/**
 * O servidor de WhatsApp (Evolution API) está no ar e com o número conectado?
 * Responde em até 4s, para a tela não ficar presa quando o servidor cai.
 */
export async function isWhatsappOnline(): Promise<boolean> {
  if (!process.env.EVOLUTION_API_URL) return false;
  try {
    const res = await api.get(`/instance/connectionState/${INSTANCE}`, { timeout: 4000 });
    const state = res.data?.instance?.state ?? res.data?.state;
    return state === "open";
  } catch {
    return false;
  }
}

/**
 * Prepara a conexão do número: cria a instância se ainda não existir e devolve o QR code
 * para ler no celular (WhatsApp › Aparelhos conectados). Se já estiver conectado, só avisa.
 * Lança erro se o servidor não responder.
 */
export async function getWhatsappQr(
  /** Com o número (ex.: 5516...), também devolve o código de 8 letras para conectar sem câmera. */
  phone?: string
): Promise<{ connected: boolean; qr?: string; pairingCode?: string }> {
  const opts = { timeout: 15_000 };
  const state = await api
    .get(`/instance/connectionState/${INSTANCE}`, opts)
    .then((r) => (r.data?.instance?.state ?? r.data?.state) as string)
    .catch((err) => {
      if (axios.isAxiosError(err) && err.response?.status === 404) return "missing";
      throw err;
    });

  if (state === "open") return { connected: true };

  if (state === "missing") {
    const created = await api.post(
      "/instance/create",
      {
        instanceName: INSTANCE,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
        ...(phone ? { number: formatPhone(phone) } : {}),
      },
      opts
    );
    return {
      connected: false,
      qr: created.data?.qrcode?.base64,
      pairingCode: created.data?.qrcode?.pairingCode ?? undefined,
    };
  }

  const query = phone ? `?number=${formatPhone(phone)}` : "";
  const res = await api.get(`/instance/connect/${INSTANCE}${query}`, opts);
  return { connected: false, qr: res.data?.base64, pairingCode: res.data?.pairingCode ?? undefined };
}

/** Link que abre o WhatsApp do aparelho com a mensagem pronta (envio manual, sem servidor). */
export function whatsappManualLink(phone: string, message: string): string {
  return `https://wa.me/${formatPhone(phone)}?text=${encodeURIComponent(message)}`;
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
  const hora = formatTimeBR(date);
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
