import { prisma } from "@/lib/prisma";

export type FotoGaleria = { id: string; url: string; alt: string };

/** Fotos do carrossel, na ordem escolhida. Se o banco falhar, lista vazia: a vitrine usa a foto única. */
export async function getFotosGaleria(): Promise<FotoGaleria[]> {
  try {
    return await prisma.galleryPhoto.findMany({
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: { id: true, url: true, alt: true },
    });
  } catch (erro) {
    console.error("Falha ao ler as fotos da galeria; usando a foto padrão.", erro);
    return [];
  }
}
