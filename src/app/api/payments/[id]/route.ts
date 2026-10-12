import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["PENDING", "SENT", "PAID", "OVERDUE"]),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = updateSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.payment.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Pagamento não encontrado" }, { status: 404 });
  }

  const payment = await prisma.payment.update({
    where: { id },
    data: {
      status: body.data.status,
      paidAt: body.data.status === "PAID" ? new Date() : existing.paidAt,
    },
  });

  return NextResponse.json(payment);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const existing = await prisma.payment.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Pagamento não encontrado" }, { status: 404 });
  }
  if (existing.status === "PAID") {
    return NextResponse.json(
      { error: "Não é possível excluir um pagamento já marcado como pago" },
      { status: 409 }
    );
  }

  await prisma.payment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
