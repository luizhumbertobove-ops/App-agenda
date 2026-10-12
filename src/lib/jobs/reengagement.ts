import { prisma } from "@/lib/prisma";
import { sendText, buildReengagementMessage } from "@/lib/evolution";
import { getSettings } from "@/lib/settings";

export async function runReengagementSends() {
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
  });

  let sent = 0;
  for (const client of clients) {
    // Não envia de novo se já enviou dentro do período de cooldown
    const lastMsg = client.whatsappLogs[0];
    if (lastMsg) {
      const daysSince = (Date.now() - lastMsg.sentAt.getTime()) / 86400000;
      if (daysSince < cooldownDays) continue;
    }

    try {
      const message = buildReengagementMessage(client.name, settings.reengagementTemplate);
      await sendText(client.phone, message);

      await prisma.whatsappLog.create({
        data: { clientId: client.id, type: "REENGAGEMENT", message },
      });

      sent++;
    } catch {
      // Continua
    }
  }

  return { sent };
}
