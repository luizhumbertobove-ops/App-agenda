import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";

export async function GET() {
  const clients = await prisma.client.findMany({
    include: {
      appointments: { orderBy: { startTime: "desc" }, take: 1 },
      payments: { where: { status: { in: ["PENDING", "SENT"] } } },
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

  try {
    const client = await prisma.client.create({ data: body.data });
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
