import { prisma } from "@/lib/prisma";
import { sendText, isWhatsappOnline, buildReengagementMessage } from "@/lib/evolution";
import { getSettings } from "@/lib/settings";
import type { MessageTarget } from "@/lib/jobs/confirmations";

/** Clientes sem atendimento há mais de N dias e fora do intervalo entre lembretes. */
export async function listReengagementTargets(): Promise<MessageTarget[]> {
  const settings = await getSettings();
  const inactivityDays = settings.reengagementInactivityDays;
  const cooldownDays = settings.reengagementCooldownDays;

  const inactivitySince = new Date();
  inactivitySince.setDate(inactivitySince.getDate() - inactivityDays);

  // Clientes cujo último atendimento foi há mais de `inactivityDays`
  const clients = await prisma.client.findMany({
    where: {
      phone: { not: "00000000000" },
      AND: [
        {
          appointments: {
            none: {
              startTime: { gte: inactivitySince },
              status: { in: ["SCHEDULED", "CONFIRMED", "DONE"] },
            },
          },
        },
        { appointments: { some: {} } },
      ],
    },
    include: {
      whatsappLogs: {
        where: { type: "REENGAGEMENT" },
        orderBy: { sentAt: "desc" },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  });

  return clients
    .filter((client) => {
      // Não envia de novo se já enviou dentro do período de cooldown
      const lastMsg = client.whatsappLogs[0];
      return !lastMsg || (Date.now() - lastMsg.sentAt.getTime()) / 86400000 >= cooldownDays;
    })
    .map((client) => ({
      clientId: client.id,
      clientName: client.name,
      phone: client.phone,
      message: buildReengagementMessage(client.name, settings.reengagementTemplate),
    }));
}

export async function runReengagementSends() {
  // Servidor fora do ar: não tenta (cada tentativa esperaria o limite de 15s).
  if (!(await isWhatsappOnline())) return { sent: 0, offline: true };
  let sent = 0;
  for (const t of await listReengagementTargets()) {
    try {
      await sendText(t.phone, t.message);
      await prisma.whatsappLog.create({
        data: { clientId: t.clientId, type: "REENGAGEMENT", message: t.message },
      });
      sent++;
    } catch {
      // Continua
    }
  }
  return { sent };
}
