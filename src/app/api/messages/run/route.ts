export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runConfirmationSends } from "@/lib/jobs/confirmations";
import { runReengagementSends } from "@/lib/jobs/reengagement";

const schema = z.object({ type: z.enum(["confirmations", "reengagement"]) });

// Disparo manual a partir da UI (autenticado via cookie de sessão, ver src/proxy.ts).
// Separado da rota de cron, que é protegida por CRON_SECRET para o Vercel Cron.
export async function POST(req: NextRequest) {
  const body = schema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const result =
    body.data.type === "confirmations"
      ? await runConfirmationSends()
      : await runReengagementSends();

  return NextResponse.json({ ok: true, ...result });
}
