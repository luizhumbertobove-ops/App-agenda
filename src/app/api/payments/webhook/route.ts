import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPixPayment } from "@/lib/mercadopago";

function extractPaymentId(req: NextRequest, body: unknown): string | null {
  const { searchParams } = new URL(req.url);
  const fromQuery = searchParams.get("data.id") ?? searchParams.get("id");
  if (fromQuery) return fromQuery;

  if (body && typeof body === "object" && "data" in body) {
    const data = (body as { data?: { id?: string | number } }).data;
    if (data?.id) return String(data.id);
  }
  return null;
}

export async function POST(req: NextRequest) {
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    // Mercado Pago às vezes notifica só via query string, sem corpo
  }

  const paymentId = extractPaymentId(req, body);
  if (!paymentId) {
    return NextResponse.json({ received: true, ignored: "no payment id" });
  }

  try {
    const mpPayment = await getPixPayment(paymentId);

    const payment =
      (await prisma.payment.findUnique({ where: { mpPaymentId: paymentId } })) ??
      (mpPayment.external_reference
        ? await prisma.payment.findFirst({
            where: { appointmentId: mpPayment.external_reference },
            orderBy: { createdAt: "desc" },
          })
        : null);

    if (!payment) {
      return NextResponse.json({ received: true, ignored: "payment not found locally" });
    }

    if (mpPayment.status === "approved") {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "PAID", paidAt: new Date(), mpPaymentId: paymentId },
      });
    } else if (!payment.mpPaymentId) {
      await prisma.payment.update({ where: { id: payment.id }, data: { mpPaymentId: paymentId } });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Erro ao processar webhook do Mercado Pago:", message);
    return NextResponse.json({ received: true, error: message });
  }
}

// Mercado Pago também pode notificar via GET com query string
export async function GET(req: NextRequest) {
  return POST(req);
}
