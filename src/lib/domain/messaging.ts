import type { MessageType, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { sendText } from "@/lib/evolution";

export type LoggedMessage = {
  clientId: string;
  type: MessageType;
  message: string;
  appointmentId?: string;
};

// Registro do envio (histórico + marca de confirmação) numa única transação.
function recordOps(m: LoggedMessage, status: string): Prisma.PrismaPromise<unknown>[] {
  const ops: Prisma.PrismaPromise<unknown>[] = [
    prisma.whatsappLog.create({
      data: { clientId: m.clientId, type: m.type, message: m.message, status },
    }),
  ];
  if (m.type === "CONFIRMATION" && m.appointmentId) {
    ops.push(
      prisma.appointment.update({
        where: { id: m.appointmentId },
        data: { confirmationSentAt: new Date() },
      })
    );
  }
  return ops;
}

/** Envia pelo servidor de WhatsApp e registra no histórico como "sent". Falha: console.error e relança (nada é registrado). */
export async function sendAndLog(phone: string, m: LoggedMessage): Promise<void> {
  try {
    await sendText(phone, m.message);
  } catch (err) {
    console.error("Falha ao enviar WhatsApp:", err);
    throw err;
  }
  await prisma.$transaction(recordOps(m, "sent"));
}

/** Registra envio feito à mão pelo WhatsApp do aparelho (status "manual"). */
export async function logManualMessage(m: LoggedMessage): Promise<void> {
  await prisma.$transaction(recordOps(m, "manual"));
}
