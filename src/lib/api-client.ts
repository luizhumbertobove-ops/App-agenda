// Helper de chamadas à API para componentes de navegador. Nunca lança erro.

export type ApiResult<T> =
  { ok: true; data: T } | { ok: false; error: string; status: number };

export const DEFAULT_API_ERROR = "Não foi possível concluir. Tente de novo.";
export const OFFLINE_API_ERROR =
  "Sem conexão. Confira a internet e tente de novo.";

/** fetch com JSON e erro padronizado; nunca lança. status 0 = sem conexão. */
export async function apiRequest<T = unknown>(
  url: string,
  init?: { method?: "POST" | "PATCH" | "DELETE"; body?: unknown },
  fallbackError: string = DEFAULT_API_ERROR,
): Promise<ApiResult<T>> {
  const hasBody = init?.body !== undefined;

  let res: Response;
  try {
    res = await fetch(url, {
      method: init?.method,
      headers: hasBody ? { "Content-Type": "application/json" } : undefined,
      body: hasBody ? JSON.stringify(init?.body) : undefined,
    });
  } catch {
    // Falha de rede: o fetch rejeita sem resposta.
    return { ok: false, status: 0, error: OFFLINE_API_ERROR };
  }

  // Corpo vazio ou não-JSON (ex.: HTML de erro do servidor) vira null.
  // A conexão também pode cair no meio da leitura do corpo.
  const text = await res.text().catch(() => "");
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (res.ok) {
    return { ok: true, data: data as T };
  }

  // Validação zod devolve objeto em `error`; só string é mensagem da API.
  const apiError =
    data && typeof data === "object" && "error" in data
      ? (data as { error: unknown }).error
      : null;
  const error =
    typeof apiError === "string" && apiError.length > 0
      ? apiError
      : fallbackError;

  return { ok: false, error, status: res.status };
}
