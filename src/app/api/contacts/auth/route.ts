import { NextRequest, NextResponse } from "next/server";
import { getCanonicalOrigin } from "@/lib/site-url";

export async function GET(req: NextRequest) {
  const origin = getCanonicalOrigin(req);
  const redirectUri = `${origin}/api/contacts/callback`;

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/contacts.readonly",
    access_type: "online",
    prompt: "consent",
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  );
}
