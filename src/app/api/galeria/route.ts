import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ArmazenamentoError, ImagemInvalidaError, uploadVitrineImage } from "@/lib/storage";

/** Quantas fotos cabem no carrossel da vitrine. */
const LIMITE_FOTOS = 20;

export async function GET() {
  const fotos = await prisma.galleryPhoto.findMany({
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: { id: true, url: true, alt: true },
  });
  return NextResponse.json({ fotos });
}

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Envio inválido." }, { status: 400 });
  }

  const file = form.get("file");
  const altBruto = form.get("alt");
  const alt = typeof altBruto === "string" ? altBruto.trim() : "";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Escolha uma imagem para enviar." }, { status: 400 });
  }
  if (alt.length > 200) {
    return NextResponse.json({ error: "A descrição passa de 200 caracteres." }, { status: 400 });
  }

  const total = await prisma.galleryPhoto.count();
  if (total >= LIMITE_FOTOS) {
    return NextResponse.json(
      { error: `A galeria já tem ${LIMITE_FOTOS} fotos. Remova alguma antes de adicionar outra.` },
      { status: 400 }
    );
  }

  let url: string;
  try {
    url = await uploadVitrineImage("galeria", file);
  } catch (erro) {
    if (erro instanceof ImagemInvalidaError) {
      return NextResponse.json({ error: erro.message }, { status: 400 });
    }
    if (erro instanceof ArmazenamentoError) {
      return NextResponse.json({ error: erro.message }, { status: 500 });
    }
    console.error("Erro inesperado ao enviar foto da galeria:", erro);
    return NextResponse.json({ error: "Não foi possível enviar a imagem. Tente de novo." }, { status: 500 });
  }

  const ultima = await prisma.galleryPhoto.aggregate({ _max: { position: true } });
  const foto = await prisma.galleryPhoto.create({
    data: { url, alt, position: (ultima._max.position ?? -1) + 1 },
    select: { id: true, url: true, alt: true },
  });

  revalidatePath("/vitrine");
  return NextResponse.json({ foto }, { status: 201 });
}
