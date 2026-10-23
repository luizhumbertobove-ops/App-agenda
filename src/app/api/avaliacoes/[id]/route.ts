import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const statusSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "HIDDEN"], { message: "Status inválido." }),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const body = statusSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }

  const existe = await prisma.googleReview.findUnique({ where: { id }, select: { id: true } });
  if (!existe) {
    return NextResponse.json({ error: "Avaliação não encontrada." }, { status: 404 });
  }

  const avaliacao = await prisma.googleReview.update({
    where: { id },
    data: { status: body.data.status },
    select: { id: true, status: true },
  });

  revalidatePath("/vitrine");
  return NextResponse.json({ avaliacao });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const avaliacao = await prisma.googleReview.findUnique({ where: { id }, select: { id: true, source: true } });
  if (!avaliacao) {
    return NextResponse.json({ error: "Avaliação não encontrada." }, { status: 404 });
  }
  if (avaliacao.source !== "MANUAL") {
    return NextResponse.json(
      {
        error:
          "Avaliações do Google não podem ser apagadas: se apagar, a busca diária do Google traz de volta. Use Ocultar.",
      },
      { status: 400 }
    );
  }

  await prisma.googleReview.delete({ where: { id } });

  revalidatePath("/vitrine");
  return NextResponse.json({ ok: true });
}
