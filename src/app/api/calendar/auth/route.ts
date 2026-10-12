import { NextRequest, NextResponse } from "next/server";
import { getCanonicalOrigin } from "@/lib/site-url";

// Fluxo de reconexão do Google Calendar (gera um novo refresh token quando o
// atual expira/é revogado). Reaproveita o redirect_uri de /api/contacts/callback,
// que já está cadastrado nas Authorized redirect URIs do Google OAuth.
export async function GET(req: NextRequest) {
  const origin = getCanonicalOrigin(req);
  const redirectUri = `${origin}/api/contacts/callback`;

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar",
    access_type: "offline",
    prompt: "consent",
    state: "calendar_reconnect",
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  );
}
