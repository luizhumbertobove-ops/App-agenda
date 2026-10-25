import { prisma } from "@/lib/prisma";
import { isWhatsappOnline, buildConfirmationMessage } from "@/lib/evolution";
import { startOfTodayBR } from "@/lib/date";
import { getSettings } from "@/lib/settings";
import { hasWhatsapp } from "@/lib/domain/constants";
import { sendAndLog } from "@/lib/domain/messaging";

export type MessageTarget = {
  clientId: string;
  clientName: string;
  phone: string;
  message: string;
  appointmentId?: string;
};

/** Quem deve receber a confirmação (atendimentos do dia-alvo ainda sem confirmação enviada). */
export async function listConfirmationTargets(): Promise<MessageTarget[]> {
  const settings = await getSettings();
  // Confirmação desativada em Mensagens: ninguém recebe.
  if (!settings.confirmationEnabled) return [];
  const daysBefore = settings.confirmationDaysBefore;

  const target = new Date(startOfTodayBR().getTime() + daysBefore * 24 * 60 * 60 * 1000);
  const targetEnd = new Date(target.getTime() + 24 * 60 * 60 * 1000 - 1);

  const appointments = await prisma.appointment.findMany({
    where: {
      startTime: { gte: target, lte: targetEnd },
      status: "SCHEDULED",
      confirmationSentAt: null,
    },
    include: { client: true },
    orderBy: { startTime: "asc" },
  });

  return appointments
    .filter((a) => hasWhatsapp(a.client?.phone))
    .map((a) => ({
      clientId: a.client!.id,
      clientName: a.client!.name,
      phone: a.client!.phone,
      appointmentId: a.id,
      message: buildConfirmationMessage(a.client!.name, a.startTime, settings.confirmationTemplate),
    }));
}

export async function runConfirmationSends() {
  if (!(await getSettings()).confirmationEnabled) return { sent: 0, disabled: true };
  // Servidor fora do ar: não tenta (cada tentativa esperaria o limite de 15s).
  if (!(await isWhatsappOnline())) return { sent: 0, offline: true };
  let sent = 0;
  for (const t of await listConfirmationTargets()) {
    try {
      await sendAndLog(t.phone, {
        clientId: t.clientId,
        type: "CONFIRMATION",
        message: t.message,
        appointmentId: t.appointmentId,
      });
      sent++;
    } catch {
      // Continua para os próximos mesmo se um falhar
    }
  }
  return { sent };
}
