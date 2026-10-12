import { NextResponse } from "next/server";
import { runReengagementSends } from "@/lib/jobs/reengagement";

// Chamado todo dia via Vercel Cron (vercel.json)
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sent } = await runReengagementSends();
  return NextResponse.json({ ok: true, sent });
}
