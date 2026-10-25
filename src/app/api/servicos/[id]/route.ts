import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateCalendarEvent } from "@/lib/google-calendar";
import { renameServiceInFutureAppointments } from "@/lib/domain/services";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  durationMins: z.number().int().min(5).optional(),
  price: z.number().min(0).optional(),
  active: z.boolean().optional(),
  description: z.string().max(2000).nullable().optional(),
  sessionDetails: z.string().max(4000).nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = updateSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }
  // Nome antigo e novo na mesma transação: sem isso, atendimentos futuros ficam com o nome velho.
  const { service, renamed } = await prisma.$transaction(async (tx) => {
    const before = body.data.name
      ? await tx.service.findUnique({ where: { id }, select: { name: true } })
      : null;
    const service = await tx.service.update({ where: { id }, data: body.data });
    const renamed =
      before && before.name !== service.name
        ? await renameServiceInFutureAppointments(tx, before.name, service.name)
        : [];
    return { service, renamed };
  }, { timeout: 15_000 });

  // Google Agenda depois da resposta e best-effort: falha lá não desfaz a renomeação.
  after(async () => {
    for (const appt of renamed) {
      if (!appt.googleEventId) continue;
      try {
        await updateCalendarEvent(appt.googleEventId, {
          title: appt.title,
          startTime: appt.startTime,
          endTime: appt.endTime,
        });
      } catch {
        /* best-effort */
      }
    }
  });

  revalidatePath("/vitrine");
  return NextResponse.json(service);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.service.delete({ where: { id } });
  revalidatePath("/vitrine");
  return NextResponse.json({ ok: true });
}
