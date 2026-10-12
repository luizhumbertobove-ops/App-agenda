import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { VITRINE_CAMPOS, getVitrineContent, vitrineCampo } from "@/lib/vitrine-content";

export async function GET() {
  const valores = await getVitrineContent();
  return NextResponse.json({ campos: VITRINE_CAMPOS, valores });
}

const updateSchema = z.object({
  valores: z.record(
    z.string(),
    z
      .string()
      .trim()
      .min(1, "Preencha todos os campos de texto.")
      .max(2000, "Texto muito longo (máximo de 2000 caracteres).")
  ),
});

export async function PUT(req: NextRequest) {
  const body = updateSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }

  const entradas = Object.entries(body.data.valores);
  for (const [key] of entradas) {
    const campo = vitrineCampo(key);
    if (!campo || campo.type === "image") {
      return NextResponse.json({ error: "Há um campo que não pode ser editado por aqui." }, { status: 400 });
    }
  }

  await prisma.$transaction(
    entradas.map(([key, value]) =>
      prisma.vitrineContent.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      })
    )
  );

  revalidatePath("/vitrine");
  return NextResponse.json({ ok: true });
}
