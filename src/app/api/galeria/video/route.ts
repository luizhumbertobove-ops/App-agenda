import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { LIMITE_ITENS_GALERIA, SELECT_ITEM_GALERIA } from "@/lib/galeria";
import { ImagemInvalidaError, confirmarVideoEnviado } from "@/lib/storage";

const videoSchema = z.object({
  path: z.string().min(1).max(200),
  alt: z.string().trim().max(200, "A descrição passa de 200 caracteres.").default(""),
});

/** Segundo passo do vídeo: confere que o arquivo chegou ao bucket e coloca no fim da galeria. */
export async function POST(req: NextRequest) {
  const body = videoSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }

  const total = await prisma.galleryPhoto.count();
  if (total >= LIMITE_ITENS_GALERIA) {
    return NextResponse.json(
      { error: `A galeria já tem ${LIMITE_ITENS_GALERIA} itens. Remova algum antes de adicionar outro.` },
      { status: 400 }
    );
  }

  let url: string;
  try {
    url = await confirmarVideoEnviado(body.data.path);
  } catch (erro) {
    if (erro instanceof ImagemInvalidaError) {
      return NextResponse.json({ error: erro.message }, { status: 400 });
    }
    console.error("Erro inesperado ao confirmar vídeo da galeria:", erro);
    return NextResponse.json({ error: "Não foi possível salvar o vídeo. Tente de novo." }, { status: 500 });
  }

  const ultima = await prisma.galleryPhoto.aggregate({ _max: { position: true } });
  const foto = await prisma.galleryPhoto.create({
    data: { url, alt: body.data.alt, type: "VIDEO", position: (ultima._max.position ?? -1) + 1 },
    select: SELECT_ITEM_GALERIA,
  });

  revalidatePath("/vitrine");
  return NextResponse.json({ foto }, { status: 201 });
}
