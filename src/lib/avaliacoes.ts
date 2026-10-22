import { prisma } from "@/lib/prisma";

/** Quantas avaliações aprovadas a vitrine mostra. */
export const AVALIACOES_NA_VITRINE = 10;

export type AvaliacaoPublica = {
  id: string;
  author: string;
  rating: number;
  text: string;
  publishedAt: Date | null;
};

/**
 * As melhores avaliações aprovadas: maior nota primeiro, depois as mais recentes.
 * Se o banco falhar, lista vazia: a seção some da vitrine.
 */
export async function getAvaliacoesVitrine(): Promise<AvaliacaoPublica[]> {
  try {
    return await prisma.googleReview.findMany({
      where: { status: "APPROVED" },
      orderBy: [{ rating: "desc" }, { publishedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
      take: AVALIACOES_NA_VITRINE,
      select: { id: true, author: true, rating: true, text: true, publishedAt: true },
    });
  } catch (erro) {
    console.error("Falha ao ler as avaliações; a seção fica oculta.", erro);
    return [];
  }
}

const UNIDADES_EM_DIAS: Record<string, number> = {
  dia: 1,
  semana: 7,
  mes: 30,
  mês: 30,
  ano: 365,
};

/**
 * Converte a data relativa do Google ("há 2 semanas", "há um mês", "Editado há 3 anos")
 * numa data aproximada a partir de `agora`. Devolve null se não reconhecer o texto.
 */
export function dataAproximada(relativa: string, agora: Date = new Date()): Date | null {
  const texto = relativa.toLowerCase().normalize("NFC");
  const m = texto.match(/há\s+(um|uma|\d+)\s+(dia|semana|m[eê]s|ano)/);
  if (!m) {
    return /hora|minuto|agora/.test(texto) ? new Date(agora) : null;
  }
  const quantidade = m[1] === "um" || m[1] === "uma" ? 1 : Number(m[1]);
  const unidade = m[2] === "mes" ? "mes" : m[2];
  const dias = quantidade * (UNIDADES_EM_DIAS[unidade] ?? 0);
  return new Date(agora.getTime() - dias * 24 * 60 * 60 * 1000);
}
