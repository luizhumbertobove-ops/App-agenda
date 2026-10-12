import { prisma } from "./prisma";

export async function getSettings() {
  const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
  if (settings) return settings;
  return prisma.settings.create({ data: { id: "singleton" } });
}
