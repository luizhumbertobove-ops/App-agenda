import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPixCharge } from "@/lib/mercadopago";
import { buildPaymentMessage } from "@/lib/evolution";
import { getSettings } from "@/lib/settings";
import { hasWhatsapp } from "@/lib/domain/constants";
import { sendAndLog } from "@/lib/domain/messaging";

// O Pix do Mercado Pago vence em cerca de 24h; abaixo disso reaproveita o mesmo código.
const PIX_REUSE_MS = 20 * 60 * 60 * 1000;

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { client: true, appointment: { include: { client: true } } },
  });
  if (!payment) {
    return NextResponse.json({ error: "Cobrança não encontrada" }, { status: 404 });
  }
  if (!(await getSettings()).paymentEnabled) {
    return NextResponse.json(
      { error: "O link de pagamento está desativado (tela Mensagens)" },
      { status: 409 }
    );
  }
  if (payment.status === "PAID") {
    return NextResponse.json({ error: "Esta cobrança já foi paga" }, { status: 409 });
  }

  const client = payment.client ?? payment.appointment?.client;
  if (!client) {
    return NextResponse.json({ error: "Cobrança sem cliente" }, { status: 422 });
  }
  if (!hasWhatsapp(client.phone)) {
    return NextResponse.json({ error: "Cliente sem WhatsApp cadastrado" }, { status: 422 });
  }

  let pixCode = payment.pixCode;
  const stillValid =
    pixCode && payment.linkSentAt && Date.now() - payment.linkSentAt.getTime() < PIX_REUSE_MS;

  if (!stillValid) {
    const pix = await createPixCharge({
      clientName: client.name,
      clientEmail: client.email ?? "cliente@semEmail.com",
      amount: payment.amount,
      description: payment.appointment?.serviceType || "Sessão de massagem",
      externalReference: payment.appointmentId ?? client.id,
    });
    pixCode = pix.pixCode;
    await prisma.payment.update({
      where: { id },
      data: {
        pixCode: pix.pixCode,
        pixQrCode: pix.pixQrCode,
        mpPaymentId: pix.paymentId,
        status: "SENT",
        linkSentAt: new Date(),
      },
    });
  }

  const settings = await getSettings();
  const message = buildPaymentMessage(client.name, payment.amount, pixCode!, settings.paymentTemplate);
  await sendAndLog(client.phone, { clientId: client.id, type: "PAYMENT_LINK", message });

  return NextResponse.json({ ok: true, renewed: !stillValid });
}
