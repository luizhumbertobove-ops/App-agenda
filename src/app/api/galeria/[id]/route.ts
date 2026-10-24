import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { SELECT_ITEM_GALERIA } from "@/lib/galeria";

const updateSchema = z.object({
  alt: z.string().trim().max(200, "A descrição passa de 200 caracteres."),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const body = updateSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }

  const existe = await prisma.galleryPhoto.findUnique({ where: { id }, select: { id: true } });
  if (!existe) {
    return NextResponse.json({ error: "Foto não encontrada." }, { status: 404 });
  }

  const foto = await prisma.galleryPhoto.update({
    where: { id },
    data: { alt: body.data.alt },
    select: SELECT_ITEM_GALERIA,
  });

  revalidatePath("/vitrine");
  return NextResponse.json({ foto });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const existe = await prisma.galleryPhoto.findUnique({ where: { id }, select: { id: true } });
  if (!existe) {
    return NextResponse.json({ error: "Foto não encontrada." }, { status: 404 });
  }

  await prisma.galleryPhoto.delete({ where: { id } });

  revalidatePath("/vitrine");
  return NextResponse.json({ ok: true });
}
