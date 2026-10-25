import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  isWhatsappOnline,
  whatsappManualLink,
  buildConfirmationMessage,
  buildReengagementMessage,
} from "@/lib/evolution";
import { getSettings } from "@/lib/settings";
import { sendAndLog } from "@/lib/domain/messaging";

const schema = z.object({
  clientId: z.string(),
  type: z.enum(["confirmation", "reengagement", "custom"]),
  customMessage: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = schema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const { clientId, type, customMessage } = body.data;

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) {
    return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  }

  const settings = await getSettings();
  let message: string;

  if (type === "custom") {
    if (!customMessage?.trim()) {
      return NextResponse.json({ error: "Mensagem não pode ser vazia" }, { status: 400 });
    }
    message = customMessage.trim();
  } else if (type === "confirmation") {
    message = buildConfirmationMessage(client.name, new Date(), settings.confirmationTemplate);
  } else {
    message = buildReengagementMessage(client.name, settings.reengagementTemplate);
  }

  const logType = type === "confirmation" ? "CONFIRMATION" : "REENGAGEMENT";

  // Servidor fora do ar: devolve o link para enviar pelo WhatsApp do aparelho.
  if (!(await isWhatsappOnline())) {
    return NextResponse.json(
      { offline: true, link: whatsappManualLink(client.phone, message), message, logType },
      { status: 503 }
    );
  }

  await sendAndLog(client.phone, { clientId: client.id, type: logType, message });

  return NextResponse.json({ ok: true });
}
