import { google } from "googleapis";
import { TZ_BR } from "./date";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

export const calendar = google.calendar({ version: "v3", auth: oauth2Client });

const CALENDAR_ID = () => process.env.GOOGLE_CALENDAR_ID ?? "primary";

export function parseEventTitle(title: string): { clientName: string; serviceType: string } {
  const parts = title.split(" - ");
  return {
    clientName: parts[0]?.trim() ?? title.trim(),
    serviceType: parts[1]?.trim() ?? "Massagem",
  };
}

// ─── Leitura ────────────────────────────────────────────────

/** Eventos com início entre `from` e `to` (passado incluído), já com as recorrências expandidas. */
export async function listEventsBetween(from: Date, to: Date) {
  const items = [];
  let pageToken: string | undefined;
  do {
    const res = await calendar.events.list({
      calendarId: CALENDAR_ID(),
      timeMin: from.toISOString(),
      timeMax: to.toISOString(),
      singleEvents: true,
      // Inclui os apagados (status "cancelled") para o app saber que saíram da agenda.
      showDeleted: true,
      maxResults: 2500,
      pageToken,
    });
    items.push(...(res.data.items ?? []));
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);
  return items;
}

// ─── Escrita ─────────────────────────────────────────────────

export async function createCalendarEvent({
  title,
  startTime,
  endTime,
  description,
}: {
  title: string;
  startTime: Date;
  endTime: Date;
  description?: string;
}): Promise<string> {
  const res = await calendar.events.insert({
    calendarId: CALENDAR_ID(),
    requestBody: {
      summary: title,
      description,
      start: { dateTime: startTime.toISOString(), timeZone: TZ_BR },
      end: { dateTime: endTime.toISOString(), timeZone: TZ_BR },
    },
  });
  return res.data.id!;
}

export async function updateCalendarEvent(
  googleEventId: string,
  {
    title,
    startTime,
    endTime,
    description,
  }: {
    title: string;
    startTime: Date;
    endTime: Date;
    description?: string;
  }
) {
  await calendar.events.update({
    calendarId: CALENDAR_ID(),
    eventId: googleEventId,
    requestBody: {
      summary: title,
      description,
      start: { dateTime: startTime.toISOString(), timeZone: TZ_BR },
      end: { dateTime: endTime.toISOString(), timeZone: TZ_BR },
    },
  });
}

export async function deleteCalendarEvent(googleEventId: string) {
  await calendar.events.delete({
    calendarId: CALENDAR_ID(),
    eventId: googleEventId,
  });
}
