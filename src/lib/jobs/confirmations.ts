import { prisma } from "@/lib/prisma";
import { sendText, buildConfirmationMessage } from "@/lib/evolution";
import { startOfTodayBR } from "@/lib/date";
import { getSettings } from "@/lib/settings";

export async function runConfirmationSends() {
  const settings = await getSettings();
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
  });

  let sent = 0;
  for (const appt of appointments) {
    if (!appt.client?.phone || appt.client.phone === "00000000000") continue;

    try {
      const message = buildConfirmationMessage(appt.client.name, appt.startTime, settings.confirmationTemplate);
      await sendText(appt.client.phone, message);

      await prisma.appointment.update({
        where: { id: appt.id },
        data: { confirmationSentAt: new Date() },
      });

      await prisma.whatsappLog.create({
        data: { clientId: appt.client.id, type: "CONFIRMATION", message },
      });

      sent++;
    } catch {
      // Continua para os próximos mesmo se um falhar
    }
  }

  return { sent };
}
