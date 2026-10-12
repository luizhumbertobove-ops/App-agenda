export const SESSION_COOKIE = "app_session";

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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
