// Envia uma mensagem por vez (até 15s cada): dá folga para dias cheios.
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { isCronRequest } from "@/lib/auth";
import { runReengagementSends } from "@/lib/jobs/reengagement";

// Chamado todo dia via Vercel Cron (vercel.json)
export async function GET(request: Request) {
  if (!isCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sent } = await runReengagementSends();
  return NextResponse.json({ ok: true, sent });
}
