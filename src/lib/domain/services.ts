import type { Tx } from "./schedule";

export type RenamedAppointment = {
  id: string;
  googleEventId: string | null;
  title: string;
  startTime: Date;
  endTime: Date;
};

// Renomear serviço troca o nome nos atendimentos que ainda vão acontecer.
// Passado e cancelado ficam como estavam: são histórico.
export async function renameServiceInFutureAppointments(
  tx: Tx,
  oldName: string,
  newName: string,
  now: Date = new Date(),
): Promise<RenamedAppointment[]> {
  const appointments = await tx.appointment.findMany({
    where: {
      serviceType: oldName,
      startTime: { gte: now },
      status: { not: "CANCELLED" },
    },
    select: { id: true, googleEventId: true, title: true, startTime: true, endTime: true },
  });

  const suffix = ` - ${oldName}`;
  const changed: RenamedAppointment[] = [];
  for (const appt of appointments) {
    // Só troca o sufixo exato: "Ana - Massagem relaxante" não termina em " - Massagem".
    const title = appt.title.endsWith(suffix)
      ? `${appt.title.slice(0, -suffix.length)} - ${newName}`
      : appt.title;
    await tx.appointment.update({
      where: { id: appt.id },
      data: { serviceType: newName, title },
    });
    changed.push({ ...appt, title });
  }
  return changed;
}
