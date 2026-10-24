import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { LIMITE_ITENS_GALERIA } from "@/lib/galeria";
import { ArmazenamentoError, ImagemInvalidaError, criarEnvioVideo } from "@/lib/storage";

const envioSchema = z.object({
  tipo: z.string().min(1).max(100),
  tamanho: z.number().int().positive(),
});

/** Primeiro passo do vídeo: devolve um link assinado para o navegador enviar direto ao Supabase. */
export async function POST(req: NextRequest) {
  const body = envioSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Envio inválido." }, { status: 400 });
  }

  const total = await prisma.galleryPhoto.count();
  if (total >= LIMITE_ITENS_GALERIA) {
    return NextResponse.json(
      { error: `A galeria já tem ${LIMITE_ITENS_GALERIA} itens. Remova algum antes de adicionar outro.` },
      { status: 400 }
    );
  }

  try {
    const envio = await criarEnvioVideo(body.data.tipo, body.data.tamanho);
    return NextResponse.json(envio);
  } catch (erro) {
    if (erro instanceof ImagemInvalidaError) {
      return NextResponse.json({ error: erro.message }, { status: 400 });
    }
    if (erro instanceof ArmazenamentoError) {
      return NextResponse.json({ error: erro.message }, { status: 500 });
    }
    console.error("Erro inesperado ao preparar envio de vídeo:", erro);
    return NextResponse.json({ error: "Não foi possível preparar o envio do vídeo. Tente de novo." }, { status: 500 });
  }
}
