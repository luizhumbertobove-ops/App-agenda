export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isWhatsappOnline, whatsappManualLink } from "@/lib/evolution";
import { listConfirmationTargets, runConfirmationSends } from "@/lib/jobs/confirmations";
import { listReengagementTargets, runReengagementSends } from "@/lib/jobs/reengagement";
import { getSettings } from "@/lib/settings";

const schema = z.object({ type: z.enum(["confirmations", "reengagement"]) });

// Disparo manual a partir da UI (autenticado via cookie de sessão, ver src/proxy.ts).
// Separado da rota de cron, que é protegida por CRON_SECRET para o Vercel Cron.
// Com o servidor de WhatsApp fora do ar, devolve a lista para o Beto enviar pelo próprio celular.
export async function POST(req: NextRequest) {
  const body = schema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }
  const type = body.data.type;

  // Modelo desativado em Mensagens: não envia nem monta a lista.
  const settings = await getSettings();
  const enabled = type === "confirmations" ? settings.confirmationEnabled : settings.reengagementEnabled;
  if (!enabled) {
    return NextResponse.json({ ok: false, disabled: true });
  }

  if (!(await isWhatsappOnline())) {
    const targets =
      type === "confirmations" ? await listConfirmationTargets() : await listReengagementTargets();
    return NextResponse.json({
      ok: false,
      offline: true,
      targets: targets.map((t) => ({ ...t, link: whatsappManualLink(t.phone, t.message) })),
    });
  }

  const result = type === "confirmations" ? await runConfirmationSends() : await runReengagementSends();
  return NextResponse.json({ ok: true, ...result });
}
