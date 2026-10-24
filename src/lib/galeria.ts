import { prisma } from "@/lib/prisma";

/** Quantos itens (fotos e vídeos) cabem no carrossel da vitrine. */
export const LIMITE_ITENS_GALERIA = 20;

export type FotoGaleria = { id: string; url: string; alt: string; type: "IMAGE" | "VIDEO" };

export const SELECT_ITEM_GALERIA = { id: true, url: true, alt: true, type: true } as const;

/** Fotos e vídeos do carrossel, na ordem escolhida. Se o banco falhar, lista vazia: a vitrine usa a foto única. */
export async function getFotosGaleria(): Promise<FotoGaleria[]> {
  try {
    return await prisma.galleryPhoto.findMany({
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: SELECT_ITEM_GALERIA,
    });
  } catch (erro) {
    console.error("Falha ao ler as fotos da galeria; usando a foto padrão.", erro);
    return [];
  }
}
