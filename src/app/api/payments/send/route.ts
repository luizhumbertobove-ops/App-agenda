import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPixCharge } from "@/lib/mercadopago";
import { sendText, buildPaymentMessage } from "@/lib/evolution";
import { getSettings } from "@/lib/settings";
import { z } from "zod";

const schema = z
  .object({
    appointmentId: z.string().optional(),
    clientId: z.string().optional(),
    amount: z.number().positive(),
    description: z.string().optional(),
  })
  .refine((data) => data.appointmentId || data.clientId, {
    message: "Informe appointmentId ou clientId",
  });

export async function POST(req: NextRequest) {
  const body = schema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const { appointmentId, amount, description } = body.data;

  const client = appointmentId
    ? (
        await prisma.appointment.findUnique({
          where: { id: appointmentId },
          include: { client: true },
        })
      )?.client
    : await prisma.client.findUnique({ where: { id: body.data.clientId } });

  if (!client) {
    return NextResponse.json({ error: "Cliente ou atendimento não encontrado" }, { status: 404 });
  }

  const pix = await createPixCharge({
    clientName: client.name,
    clientEmail: client.email ?? "cliente@semEmail.com",
    amount,
    description: description || "Sessão de massagem",
    externalReference: appointmentId ?? client.id,
  });

  // Reaproveita a cobrança pendente do agendamento em vez de duplicar
  const existingPayment = appointmentId
    ? await prisma.payment.findFirst({
        where: { appointmentId, status: { in: ["PENDING", "SENT"] } },
      })
    : null;

  const paymentData = {
    amount,
    pixCode: pix.pixCode,
    pixQrCode: pix.pixQrCode,
    mpPaymentId: pix.paymentId,
    status: "SENT" as const,
    linkSentAt: new Date(),
  };

  const payment = existingPayment
    ? await prisma.payment.update({ where: { id: existingPayment.id }, data: paymentData })
    : await prisma.payment.create({
        data: { clientId: client.id, appointmentId, ...paymentData },
      });

  if (client.phone && client.phone !== "00000000000") {
    const settings = await getSettings();
    const message = buildPaymentMessage(client.name, amount, pix.pixCode, settings.paymentTemplate);
    await sendText(client.phone, message);

    await prisma.whatsappLog.create({
      data: { clientId: client.id, type: "PAYMENT_LINK", message },
    });
  }

  return NextResponse.json({ ok: true, paymentId: payment.id, pixCode: pix.pixCode });
}
