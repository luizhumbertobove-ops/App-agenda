/** Lado maior da imagem depois de reduzida: sobra para tela cheia e carrossel. */
const LADO_MAXIMO = 2000;
/** Abaixo disso, e já no tamanho certo, a imagem vai como está. */
const TAMANHO_SEM_COMPRESSAO = 1.5 * 1024 * 1024;
const QUALIDADE = 0.85;

/**
 * Reduz a foto no navegador antes do envio. A Vercel recusa corpos acima de 4,5 MB antes de chegar
 * na rota, e foto de celular costuma passar disso. Se algo falhar, devolve o arquivo original e o
 * servidor decide.
 */
export async function comprimirImagem(arquivo: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(arquivo, { imageOrientation: "from-image" });
    const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));

    if (escala === 1 && arquivo.size <= TAMANHO_SEM_COMPRESSAO) {
      bitmap.close();
      return arquivo;
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * escala);
    canvas.height = Math.round(bitmap.height * escala);
    const contexto = canvas.getContext("2d");
    if (!contexto) {
      bitmap.close();
      return arquivo;
    }
    contexto.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALIDADE));
    if (!blob || blob.size >= arquivo.size) return arquivo;

    const nome = arquivo.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], nome, { type: "image/jpeg" });
  } catch {
    return arquivo;
  }
}

/** Mensagem para a resposta 413 da Vercel, que não vem em JSON. */
export const MENSAGEM_ARQUIVO_GRANDE = "A foto é grande demais para enviar. Escolha uma foto menor.";
