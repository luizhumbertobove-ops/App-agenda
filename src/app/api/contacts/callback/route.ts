import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const isCalendarReconnect = searchParams.get("state") === "calendar_reconnect";

  if (error || !code) {
    return NextResponse.redirect(`${origin}/clientes?error=google_auth_cancelled`);
  }

  const redirectUri = `${origin}/api/contacts/callback`;

  // Trocar code por access_token (+ refresh_token, no fluxo de reconexão do Calendar)
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    if (isCalendarReconnect) {
      const details = await tokenRes.text();
      return new NextResponse(`Falha ao trocar o código pelo token:\n\n${details}`, {
        status: 500,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
    return NextResponse.redirect(`${origin}/clientes?error=token_exchange_failed`);
  }

  const { access_token, refresh_token } = await tokenRes.json();

  if (isCalendarReconnect) {
    const html = refresh_token
      ? `<pre style="font:14px monospace;white-space:pre-wrap;padding:24px;max-width:680px">Google Calendar reconectado.

Copie este valor e cole na variável GOOGLE_REFRESH_TOKEN
(no .env local e nas Environment Variables do projeto na Vercel),
depois faça um redeploy:

${refresh_token}
</pre>`
      : `<pre style="font:14px monospace;white-space:pre-wrap;padding:24px;max-width:680px">O Google não retornou um refresh_token desta vez.

Isso costuma acontecer quando o acesso já tinha sido concedido antes.
Vá em https://myaccount.google.com/permissions, remova o acesso do
app "App Beto" e tente de novo em /api/calendar/auth.
</pre>`;
    return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  // Salvar token em cookie httpOnly (10 min) — fluxo normal de importação de contatos
  const response = NextResponse.redirect(`${origin}/clientes/importar`);
  response.cookies.set("gcal_contact_token", access_token, {
    httpOnly: true,
    maxAge: 600,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  return response;
}
