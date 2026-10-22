import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isCronRequest } from "@/lib/auth";
import { dataAproximada } from "@/lib/avaliacoes";

const importSchema = z.object({
  reviews: z
    .array(
      z.object({
        externalId: z.string().trim().min(1).max(200),
        author: z.string().trim().min(1).max(120),
        rating: z.number().int().min(1).max(5),
        text: z.string().trim().max(5000).default(""),
        relativeDate: z.string().trim().max(80).default(""),
      })
    )
    .max(500),
});

/**
 * Recebe as avaliações lidas pelo scraper (GitHub Action diário), autenticado pelo CRON_SECRET.
 * Novas entram como PENDING; as já conhecidas só têm o texto e a nota atualizados (o status
 * escolhido pelo Beto nunca é mexido).
 */
export async function POST(request: Request) {
  if (!isCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = importSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }

  const agora = new Date();
  const existentes = await prisma.googleReview.findMany({
    where: { externalId: { in: body.data.reviews.map((r) => r.externalId) } },
    select: { externalId: true },
  });
  const conhecidos = new Set(existentes.map((r) => r.externalId));

  let novas = 0;
  for (const r of body.data.reviews) {
    if (conhecidos.has(r.externalId)) {
      await prisma.googleReview.update({
        where: { externalId: r.externalId },
        data: { author: r.author, rating: r.rating, text: r.text },
      });
    } else {
      await prisma.googleReview.create({
        data: {
          externalId: r.externalId,
          author: r.author,
          rating: r.rating,
          text: r.text,
          publishedAt: dataAproximada(r.relativeDate, agora),
        },
      });
      conhecidos.add(r.externalId);
      novas++;
    }
  }

  revalidatePath("/vitrine");
  return NextResponse.json({ ok: true, recebidas: body.data.reviews.length, novas });
}
