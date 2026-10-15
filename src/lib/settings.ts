import { prisma } from "./prisma";
import { DEFAULT_WORK_SCHEDULE, parseWorkSchedule, type WorkSchedule } from "./work-schedule";

export async function getSettings() {
  const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
  if (settings) return settings;
  return prisma.settings.create({ data: { id: "singleton" } });
}

/** Jornada salva nas Configurações; se o banco falhar, usa a padrão (a agenda nunca quebra). */
export async function getWorkSchedule(): Promise<WorkSchedule> {
  try {
    const settings = await prisma.settings.findUnique({
      where: { id: "singleton" },
      select: { workSchedule: true },
    });
    return parseWorkSchedule(settings?.workSchedule);
  } catch (erro) {
    console.error("Falha ao ler a jornada de trabalho; usando a padrão.", erro);
    return DEFAULT_WORK_SCHEDULE;
  }
}
