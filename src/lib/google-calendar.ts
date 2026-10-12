import { google } from "googleapis";
import { startOfTodayBR, endOfTodayBR } from "./date";

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

export async function listUpcomingEvents(daysAhead = 30) {
  const now = new Date();
  const future = new Date();
  future.setDate(future.getDate() + daysAhead);

  const res = await calendar.events.list({
    calendarId: CALENDAR_ID(),
    timeMin: now.toISOString(),
    timeMax: future.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
  });

  return res.data.items ?? [];
}

export async function listTodayEvents() {
  const res = await calendar.events.list({
    calendarId: CALENDAR_ID(),
    timeMin: startOfTodayBR().toISOString(),
    timeMax: endOfTodayBR().toISOString(),
    singleEvents: true,
    orderBy: "startTime",
  });
  return res.data.items ?? [];
}

export async function listTomorrowEvents() {
  const start = new Date(startOfTodayBR().getTime() + 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);

  const res = await calendar.events.list({
    calendarId: CALENDAR_ID(),
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
  });
  return res.data.items ?? [];
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
      start: { dateTime: startTime.toISOString(), timeZone: "America/Sao_Paulo" },
      end: { dateTime: endTime.toISOString(), timeZone: "America/Sao_Paulo" },
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
      start: { dateTime: startTime.toISOString(), timeZone: "America/Sao_Paulo" },
      end: { dateTime: endTime.toISOString(), timeZone: "America/Sao_Paulo" },
    },
  });
}

export async function deleteCalendarEvent(googleEventId: string) {
  await calendar.events.delete({
    calendarId: CALENDAR_ID(),
    eventId: googleEventId,
  });
}
