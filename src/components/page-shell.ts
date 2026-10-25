/**
 * Moldura de toda tela do admin: mesma largura e margens em todas, para o conteúdo
 * não mudar de lugar quando se troca de tela. `narrow` estreita os filhos (formulários)
 * mantendo o alinhamento à esquerda.
 *
 * É um contêiner (@container): as telas se dividem em colunas com `@4xl:`, que olha o
 * espaço que o conteúdo tem de fato (já descontada a barra lateral), não a largura da tela.
 */
export function pageShell({ narrow = false }: { narrow?: boolean } = {}) {
  return `@container mx-auto w-full max-w-6xl px-5 pt-6 pb-10 md:px-8 md:pt-8${narrow ? " *:max-w-3xl" : ""}`;
}
