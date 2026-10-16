import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const sellSchema = z.object({
  sessions: z.number().int().min(2).max(50),
  amount: z.number().positive(),
  // Já recebeu o valor do pacote (entra como pago) ou fica a receber.
  paid: z.boolean(),
});

/**
 * Vende um pacote de sessões ao cliente: o valor entra uma única vez no Financeiro e
 * as sessões seguintes são concluídas "pelo pacote", sem nova cobrança.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = sellSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) {
    return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  }

  const { sessions, amount, paid } = body.data;
  const subscription = await prisma.$transaction(async (tx) => {
    const plan = await tx.plan.create({
      data: { name: `Pacote de ${sessions} sessões`, sessions, price: amount, validityDays: 0 },
    });
    const sub = await tx.planSubscription.create({ data: { clientId: id, planId: plan.id } });
    await tx.payment.create({
      data: {
        clientId: id,
        amount,
        planSubscriptionId: sub.id,
        ...(paid ? { status: "PAID" as const, paidAt: new Date() } : {}),
      },
    });
    return sub;
  });

  return NextResponse.json(subscription, { status: 201 });
}
