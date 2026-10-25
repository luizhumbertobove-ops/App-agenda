import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

const memberSchema = z.object({
  clientId: z.string().min(1),
});

/** Adiciona um membro ao pacote (pacote familiar: todos usam o mesmo saldo). */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ subscriptionId: string }> }
) {
  const { subscriptionId } = await params;
  const body = memberSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const sub = await prisma.planSubscription.findUnique({
    where: { id: subscriptionId },
    include: { _count: { select: { members: true } } },
  });
  if (!sub) {
    return NextResponse.json({ error: "Pacote não encontrado." }, { status: 404 });
  }
  // Mesmo limite da venda.
  if (sub._count.members >= 10) {
    return NextResponse.json({ error: "O pacote já tem 10 membros." }, { status: 400 });
  }

  const client = await prisma.client.findUnique({ where: { id: body.data.clientId } });
  if (!client) {
    return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
  }

  if (body.data.clientId === sub.clientId) {
    return NextResponse.json({ error: "O titular já faz parte do pacote." }, { status: 400 });
  }

  try {
    const member = await prisma.planSubscriptionMember.create({
      data: {
        subscriptionId,
        clientId: body.data.clientId,
      },
    });
    return NextResponse.json(member, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "Já faz parte do pacote." }, { status: 409 });
    }
    throw err;
  }
}

/** Tira um membro do pacote; as sessões que ele já usou continuam contadas. */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ subscriptionId: string }> }
) {
  const { subscriptionId } = await params;
  const body = memberSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  await prisma.planSubscriptionMember.deleteMany({
    where: {
      subscriptionId,
      clientId: body.data.clientId,
    },
  });

  return new NextResponse(null, { status: 204 });
}
