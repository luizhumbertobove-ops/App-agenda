import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const AVALIACAO_SELECT = {
  id: true,
  author: true,
  rating: true,
  text: true,
  status: true,
  source: true,
  publishedAt: true,
} as const;

/** Todas as avaliações: novas primeiro dentro de cada status; as sem data vão para o fim. */
export async function GET() {
  const avaliacoes = await prisma.googleReview.findMany({
    orderBy: [
      { status: "asc" },
      { publishedAt: { sort: "desc", nulls: "last" } },
      { createdAt: "desc" },
    ],
    select: AVALIACAO_SELECT,
  });
  return NextResponse.json({ avaliacoes });
}

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

const cadastroSchema = z.object({
  author: z.string().trim().min(1, "Escreva o nome de quem avaliou.").max(120, "Nome muito longo (máximo de 120 caracteres)."),
  rating: z
    .number({ message: "Escolha a nota de 1 a 5." })
    .int("Escolha a nota de 1 a 5.")
    .min(1, "Escolha a nota de 1 a 5.")
    .max(5, "Escolha a nota de 1 a 5."),
  text: z.string().trim().max(5000, "Texto muito longo (máximo de 5000 caracteres).").default(""),
  publishedAt: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine((valor) => !valor || DATA_ISO.test(valor), "Data inválida.")
    .refine((valor) => !valor || !Number.isNaN(new Date(`${valor}T12:00:00Z`).getTime()), "Data inválida."),
});

/** Cadastro à mão (copiado do Google): entra já aprovado. */
export async function POST(req: NextRequest) {
  const body = cadastroSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }

  const { author, rating, text, publishedAt } = body.data;

  const avaliacao = await prisma.googleReview.create({
    data: {
      author,
      rating,
      text,
      // Meio-dia UTC: a data não muda de dia ao ser lida no fuso do Brasil.
      publishedAt: publishedAt ? new Date(`${publishedAt}T12:00:00Z`) : null,
      source: "MANUAL",
      status: "APPROVED",
    },
    select: AVALIACAO_SELECT,
  });

  revalidatePath("/vitrine");
  return NextResponse.json({ avaliacao }, { status: 201 });
}
