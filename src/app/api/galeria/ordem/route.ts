import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const ordemSchema = z.object({
  ids: z
    .array(z.string().min(1).max(100))
    .max(20, "A galeria tem no máximo 20 fotos.")
    .refine((ids) => new Set(ids).size === ids.length, "Há fotos repetidas na ordem."),
});

/** Grava a nova ordem: a posição de cada foto passa a ser o índice dela na lista enviada. */
export async function PUT(req: NextRequest) {
  const body = ordemSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }

  const { ids } = body.data;
  const encontradas = await prisma.galleryPhoto.count({ where: { id: { in: ids } } });
  if (encontradas !== ids.length) {
    return NextResponse.json({ error: "Alguma foto não existe mais. Recarregue a página." }, { status: 400 });
  }

  await prisma.$transaction(
    ids.map((id, position) => prisma.galleryPhoto.update({ where: { id }, data: { position } }))
  );

  revalidatePath("/vitrine");
  return NextResponse.json({ ok: true });
}
