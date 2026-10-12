import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const activeOnly = new URL(req.url).searchParams.get("all") !== "1";
  const services = await prisma.service.findMany({
    where: activeOnly ? { active: true } : undefined,
    orderBy: { name: "asc" },
  });
  return NextResponse.json(services);
}

const createSchema = z.object({
  name: z.string().min(2),
  durationMins: z.number().int().min(5),
  price: z.number().min(0),
});

export async function POST(req: NextRequest) {
  const body = createSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }
  const service = await prisma.service.create({ data: { ...body.data, active: true } });
  return NextResponse.json(service, { status: 201 });
}
