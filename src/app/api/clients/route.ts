import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";

export async function GET(req: NextRequest) {
  // ?simple=1: só id, nome e telefone (para busca de cliente nos formulários).
  if (new URL(req.url).searchParams.get("simple") === "1") {
    const clients = await prisma.client.findMany({
      select: { id: true, name: true, phone: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(clients);
  }
  const clients = await prisma.client.findMany({
    include: {
      appointments: { orderBy: { startTime: "desc" }, take: 1 },
      payments: { where: { status: { in: ["PENDING", "SENT", "OVERDUE"] } } },
      planSubscriptions: { where: { active: true }, include: { plan: true } },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(clients);
}

const createSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  email: z.string().email().optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = createSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  // Telefone no padrão da base: só dígitos, com o 55 do país. Confere com e sem 55.
  const digits = body.data.phone.replace(/\D/g, "");
  const local = digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;
  const phone = `55${local}`;
  const existing = await prisma.client.findFirst({ where: { phone: { in: [phone, local] } } });
  if (existing) {
    return NextResponse.json(
      { error: { fieldErrors: { phone: [`Telefone já cadastrado para ${existing.name}`] } } },
      { status: 409 }
    );
  }

  try {
    const client = await prisma.client.create({ data: { ...body.data, phone } });
    return NextResponse.json(client, { status: 201 });
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
