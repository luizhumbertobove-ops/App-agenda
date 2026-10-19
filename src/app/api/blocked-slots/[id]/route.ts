import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  reason: z.string().trim().max(200).nullable().optional(),
});

/** Edita um bloqueio (dia, início, fim e motivo) sem precisar apagar e criar outro. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = updateSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }
  const start = new Date(body.data.startTime);
  const end = new Date(body.data.endTime);
  if (end <= start) {
    return NextResponse.json({ error: "O fim precisa ser depois do início." }, { status: 400 });
  }
  const slot = await prisma.blockedSlot.update({
    where: { id },
    data: { startTime: start, endTime: end, reason: body.data.reason || null },
  });
  return NextResponse.json(slot);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.blockedSlot.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
