import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, computeSessionToken, safeEqual } from "@/lib/auth";

// Limite de tentativas erradas por IP (em memória: vale por instância do servidor, o que já
// basta para frear quem tenta adivinhar a senha em sequência).
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 10;
const fails = new Map<string, { count: number; since: number }>();

function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const now = Date.now();
  const entry = fails.get(ip);
  if (entry && now - entry.since < WINDOW_MS && entry.count >= MAX_FAILS) {
    return NextResponse.json(
      { error: "Muitas tentativas. Espere alguns minutos e tente de novo." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const password = body?.password;

  if (!process.env.APP_PASSWORD || typeof password !== "string" || !safeEqual(password, process.env.APP_PASSWORD)) {
    const atual = entry && now - entry.since < WINDOW_MS ? entry : { count: 0, since: now };
    fails.set(ip, { count: atual.count + 1, since: atual.since });
    return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
  }

  fails.delete(ip);
  const token = await computeSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
