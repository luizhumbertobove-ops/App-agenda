import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { deleteCalendarEvent } from "@/lib/google-calendar";
import { pickSuccessor } from "@/lib/plan-access";
import { OPEN_PAYMENT_STATUSES } from "@/lib/domain/constants";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      appointments: { orderBy: { startTime: "desc" } },
      payments: { where: { status: { not: "CANCELLED" } }, orderBy: { createdAt: "desc" } },
      planSubscriptions: { include: { plan: true }, orderBy: { purchasedAt: "desc" } },
      whatsappLogs: { orderBy: { sentAt: "desc" }, take: 20 },
    },
  });
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(client);
}

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(10).optional(),
  email: z.string().email().optional().nullable(),
  notes: z.string().optional().nullable(),
  birthday: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = updateSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  try {
    const client = await prisma.client.update({ where: { id }, data: body.data });
    return NextResponse.json(client);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { error: { fieldErrors: { phone: ["Telefone já cadastrado para outro cliente"] } } },
        { status: 409 }
      );
    }
    throw err;
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) {
    return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  }

  // Atendimentos, planos e logs são removidos junto com o cliente. Pagamentos
  // são preservados (órfãos, sem clientId/appointmentId) para não perder o
  // histórico financeiro — eles continuam contando nos totais do Financeiro.
  // Eventos futuros do cliente no Google: apagados também, senão a próxima sincronização
  // os traria de volta como atendimentos novos. O histórico passado fica na agenda do Google.
  const futureEvents = await prisma.appointment.findMany({
    where: { clientId: id, googleEventId: { not: null }, startTime: { gte: new Date() } },
    select: { googleEventId: true },
  });

  // Pacote familiar com saldo não some junto com o titular: passa ao membro mais antigo.
  const owned = await prisma.planSubscription.findMany({
    where: { clientId: id },
    include: { plan: true, members: true },
  });
  const handovers = owned.flatMap((sub) => {
    const to = pickSuccessor(sub);
    return to ? [{ subscriptionId: sub.id, to }] : [];
  });

  await prisma.$transaction([
    ...handovers.flatMap(({ subscriptionId, to }) => [
      prisma.planSubscriptionMember.deleteMany({ where: { subscriptionId, clientId: to } }),
      prisma.planSubscription.update({ where: { id: subscriptionId }, data: { clientId: to } }),
    ]),
    // Cobranças em aberto deixam de valer (senão ficariam no "A receber" para sempre).
    prisma.payment.updateMany({
      where: { clientId: id, status: { in: [...OPEN_PAYMENT_STATUSES] } },
      data: { status: "CANCELLED" },
    }),
    prisma.payment.updateMany({ where: { clientId: id }, data: { clientId: null, appointmentId: null } }),
    prisma.whatsappLog.deleteMany({ where: { clientId: id } }),
    prisma.planSubscription.deleteMany({ where: { clientId: id } }),
    prisma.appointment.deleteMany({ where: { clientId: id } }),
    prisma.client.delete({ where: { id } }),
  ]);

  for (const { googleEventId } of futureEvents) {
    await deleteCalendarEvent(googleEventId!).catch(() => {
      // best-effort: se falhar, o evento continua no Google
    });
  }

  return NextResponse.json({ ok: true });
}
