import { NextResponse } from "next/server";
import { runConfirmationSends } from "@/lib/jobs/confirmations";

// Chamado todo dia via Vercel Cron (vercel.json)
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sent } = await runConfirmationSends();
  return NextResponse.json({ ok: true, sent });
}
