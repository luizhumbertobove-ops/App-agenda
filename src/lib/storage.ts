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

  const { supabaseUrl, headers } = configuracao();
  const path = `${key}-${Date.now()}.${ext}`;

  const resposta = await fetch(`${supabaseUrl}/storage/v1/object/vitrine/${path}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": file.type, "x-upsert": "true" },
    body: Buffer.from(await file.arrayBuffer()),
  });

  if (!resposta.ok) {
    console.error("Falha no upload para o Supabase Storage:", resposta.status, await resposta.text());
    throw new ArmazenamentoError("Não foi possível enviar a imagem. Tente de novo.");
  }

  return urlPublica(supabaseUrl, path);
}

const VIDEOS_ACEITOS: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

/** Limite global de arquivo do Supabase no plano gratuito. */
export const TAMANHO_MAXIMO_VIDEO = 50 * 1024 * 1024;

/** Prefixo dos vídeos da galeria no bucket: só caminhos assim podem ser registrados. */
const PREFIXO_VIDEO = "galeria-video-";

/**
 * Cria um link assinado para o navegador enviar o vídeo direto ao Supabase Storage, sem passar
 * pela Vercel (que recusa corpos acima de 4,5 MB). O link vale para um único caminho novo.
 */
export async function criarEnvioVideo(tipo: string, tamanho: number): Promise<{ path: string; uploadUrl: string }> {
  const ext = VIDEOS_ACEITOS[tipo];
  if (!ext) {
    throw new ImagemInvalidaError("Formato não aceito. Envie um vídeo MP4, WebM ou MOV.");
  }
  if (tamanho > TAMANHO_MAXIMO_VIDEO) {
    throw new ImagemInvalidaError("O vídeo passa de 50 MB. Escolha um vídeo mais curto.");
  }

  const { supabaseUrl, headers } = configuracao();
  const path = `${PREFIXO_VIDEO}${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

  const resposta = await fetch(`${supabaseUrl}/storage/v1/object/upload/sign/vitrine/${path}`, {
    method: "POST",
    headers,
  });
  const retorno = (await resposta.json().catch(() => null)) as { url?: string } | null;

  if (!resposta.ok || !retorno?.url) {
    console.error("Falha ao assinar envio de vídeo no Supabase Storage:", resposta.status, retorno);
    throw new ArmazenamentoError("Não foi possível preparar o envio do vídeo. Tente de novo.");
  }

  return { path, uploadUrl: `${supabaseUrl}/storage/v1${retorno.url}` };
}

/**
 * Confere que o vídeo enviado pelo link assinado chegou ao bucket e devolve a URL pública.
 * Lança ImagemInvalidaError se o caminho não for de vídeo da galeria ou se o arquivo não existir.
 */
export async function confirmarVideoEnviado(path: string): Promise<string> {
  const ext = path.split(".").pop() ?? "";
  if (!path.startsWith(PREFIXO_VIDEO) || !/^[\w.-]+$/.test(path) || !Object.values(VIDEOS_ACEITOS).includes(ext)) {
    throw new ImagemInvalidaError("Vídeo inválido.");
  }

  const { supabaseUrl } = configuracao();
  const url = urlPublica(supabaseUrl, path);
  const resposta = await fetch(url, { method: "HEAD" });
  if (!resposta.ok) {
    throw new ImagemInvalidaError("O vídeo não chegou ao armazenamento. Envie de novo.");
  }

  return url;
}

function configuracao() {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new ArmazenamentoError("Armazenamento de imagens não configurado");
  }
  return {
    supabaseUrl,
    headers: {
      // Chaves novas (sb_secret_…) só autenticam pelo cabeçalho apikey; Bearer exige JWT (chave service_role antiga).
      apikey: serviceKey,
      ...(serviceKey.startsWith("eyJ") ? { Authorization: `Bearer ${serviceKey}` } : {}),
    } as Record<string, string>,
  };
}

function urlPublica(supabaseUrl: string, path: string) {
  return `${supabaseUrl}/storage/v1/object/public/vitrine/${path}`;
}
