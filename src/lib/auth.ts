export const SESSION_COOKIE = "app_session";

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Comparação em tempo constante: não revela, pelo tempo de resposta, quantos caracteres batem. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Requisição feita pelo Vercel Cron (cabeçalho Authorization: Bearer CRON_SECRET). */
export function isCronRequest(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return safeEqual(req.headers.get("authorization") ?? "", `Bearer ${secret}`);
}

/** Requisição com o cookie de sessão do admin válido. */
export async function hasValidSession(req: Request): Promise<boolean> {
  const cookie = req.headers.get("cookie") ?? "";
  const token = cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  if (!token) return false;
  return safeEqual(token, await computeSessionToken());
}

// Token determinístico derivado de APP_PASSWORD via HMAC — permite ao
// middleware (Edge runtime) validar a sessão sem guardar estado em banco.
export async function computeSessionToken(): Promise<string> {
  const password = process.env.APP_PASSWORD ?? "";
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode("app-beto-session"));
  return toHex(signature);
}
