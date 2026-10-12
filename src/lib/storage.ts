const TIPOS_ACEITOS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const TAMANHO_MAXIMO = 5 * 1024 * 1024;

/** Imagem fora do formato ou do tamanho permitido: erro de quem enviou. */
export class ImagemInvalidaError extends Error {}

/** Falha de configuração ou de comunicação com o Supabase Storage. */
export class ArmazenamentoError extends Error {}

/**
 * Envia a imagem para o bucket público `vitrine` do Supabase Storage e devolve a URL pública.
 * Só servidor: usa a service role key, que nunca pode chegar ao navegador.
 */
export async function uploadVitrineImage(key: string, file: File): Promise<string> {
  const ext = TIPOS_ACEITOS[file.type];
  if (!ext) {
    throw new ImagemInvalidaError("Formato não aceito. Envie uma imagem JPG, PNG ou WebP.");
  }
  if (file.size > TAMANHO_MAXIMO) {
    throw new ImagemInvalidaError("A imagem passa de 5 MB. Escolha um arquivo menor.");
  }

  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new ArmazenamentoError("Armazenamento de imagens não configurado");
  }

  const path = `${key}-${Date.now()}.${ext}`;

  const resposta = await fetch(`${supabaseUrl}/storage/v1/object/vitrine/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": file.type,
      "x-upsert": "true",
    },
    body: Buffer.from(await file.arrayBuffer()),
  });

  if (!resposta.ok) {
    console.error("Falha no upload para o Supabase Storage:", resposta.status, await resposta.text());
    throw new ArmazenamentoError("Não foi possível enviar a imagem. Tente de novo.");
  }

  return `${supabaseUrl}/storage/v1/object/public/vitrine/${path}`;
}
