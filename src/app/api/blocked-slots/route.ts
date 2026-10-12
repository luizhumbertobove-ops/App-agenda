import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET() {
  const slots = await prisma.blockedSlot.findMany({ orderBy: { startTime: "asc" } });
  return NextResponse.json(slots);
}

const createSchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  reason: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = createSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }
  const slot = await prisma.blockedSlot.create({
    data: {
      id: crypto.randomUUID(),
      startTime: new Date(body.data.startTime),
      endTime: new Date(body.data.endTime),
      reason: body.data.reason,
    },
  });
  return NextResponse.json(slot, { status: 201 });
}
