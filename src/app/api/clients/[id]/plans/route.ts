import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizeMemberIds } from "@/lib/plan-access";

const sellSchema = z.object({
  sessions: z.number().int().min(2).max(50),
  amount: z.number().positive(),
  // Já recebeu o valor do pacote (entra como pago) ou fica a receber.
  paid: z.boolean(),
  // Outros clientes que usam o mesmo saldo.
  memberIds: z.array(z.string()).max(10).default([]),
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

  const { sessions, amount, paid, memberIds } = body.data;

  const normalized = normalizeMemberIds(id, memberIds);
  if (!normalized.ok) {
    return NextResponse.json({ error: normalized.error }, { status: 400 });
  }

  if (normalized.ids.length > 0) {
    const count = await prisma.client.count({ where: { id: { in: normalized.ids } } });
    if (count !== normalized.ids.length) {
      return NextResponse.json({ error: "Cliente não encontrado." }, { status: 400 });
    }
  }

  const subscription = await prisma.$transaction(async (tx) => {
    const planName = normalized.ids.length > 0
      ? `Pacote familiar de ${sessions} sessões`
      : `Pacote de ${sessions} sessões`;
    const plan = await tx.plan.create({
      data: { name: planName, sessions, price: amount, validityDays: 0 },
    });
    const sub = await tx.planSubscription.create({ data: { clientId: id, planId: plan.id } });
    if (normalized.ids.length > 0) {
      await tx.planSubscriptionMember.createMany({
        data: normalized.ids.map((clientId) => ({ subscriptionId: sub.id, clientId })),
      });
    }
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
