export const maxDuration = 30;

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { google } from "googleapis";

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("gcal_contact_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({ access_token: accessToken });

  try {
    const people = google.people({ version: "v1", auth: oauth2Client });

    const connections = [];
    let pageToken: string | undefined;
    do {
      const res = await people.people.connections.list({
        resourceName: "people/me",
        pageSize: 1000,
        personFields: "names,phoneNumbers,emailAddresses",
        pageToken,
      });
      connections.push(...(res.data.connections ?? []));
      pageToken = res.data.nextPageToken ?? undefined;
    } while (pageToken);

    const contacts = connections
      .map((c) => {
        const name = c.names?.[0]?.displayName?.trim();
        const phones = (c.phoneNumbers ?? [])
          .map((p) => {
            // Prefer canonical form (international), fallback to value stripped to digits
            const raw = p.canonicalForm ?? p.value ?? "";
            return raw.replace(/\D/g, "");
          })
          .filter((p) => p.length >= 10);
        const email = c.emailAddresses?.[0]?.value?.trim();
        return { name, phones, email };
      })
      .filter((c) => c.name && c.phones.length > 0);

    return NextResponse.json(contacts);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("Erro ao buscar contatos do Google:", detail);
    return NextResponse.json({ error: "Erro ao buscar contatos do Google", detail }, { status: 500 });
  }
}
