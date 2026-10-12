import { NextRequest } from "next/server";

const PRODUCTION_ORIGIN = "https://appbeto-puce.vercel.app";

// O Vercel gera uma URL única por deploy (preview), que nunca está
// cadastrada nas Authorized redirect URIs do Google OAuth nem alcançável
// por webhooks externos (Mercado Pago). Por isso usamos sempre a origem
// canônica de produção, exceto em localhost.
export function getCanonicalOrigin(req?: NextRequest): string {
  if (!req) return PRODUCTION_ORIGIN;
  const { hostname, origin } = new URL(req.url);
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return origin;
  }
  return PRODUCTION_ORIGIN;
}
