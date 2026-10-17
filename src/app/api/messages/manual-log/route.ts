import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  clientId: z.string(),
  type: z.enum(["CONFIRMATION", "REENGAGEMENT", "PAYMENT_LINK", "NO_SHOW"]),
  message: z.string().min(1),
  appointmentId: z.string().optional(),
});

/**
 * Registra uma mensagem enviada à mão pelo WhatsApp do aparelho (servidor fora do ar):
 * entra no histórico e nos contadores, e a confirmação não é oferecida de novo.
 */
export async function POST(req: NextRequest) {
  const body = schema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }
  const { clientId, type, message, appointmentId } = body.data;

  await prisma.whatsappLog.create({ data: { clientId, type, message, status: "manual" } });
  if (type === "CONFIRMATION" && appointmentId) {
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { confirmationSentAt: new Date() },
    });
  }
  return NextResponse.json({ ok: true });
}
