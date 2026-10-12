import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { z } from "zod";

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json(settings);
}

const updateSchema = z.object({
  confirmationTemplate: z.string().optional().nullable(),
  paymentTemplate: z.string().optional().nullable(),
  reengagementTemplate: z.string().optional().nullable(),
  noShowTemplate: z.string().optional().nullable(),
  confirmationDaysBefore: z.number().int().min(0).max(30).optional(),
  confirmationSendHour: z.number().int().min(0).max(23).optional(),
  reengagementInactivityDays: z.number().int().min(1).max(365).optional(),
  reengagementCooldownDays: z.number().int().min(1).max(365).optional(),
  monthlyGoal: z.number().min(0).optional().nullable(),
});

export async function PATCH(req: NextRequest) {
  const body = updateSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  await getSettings();
  const updated = await prisma.settings.update({ where: { id: "singleton" }, data: body.data });
  return NextResponse.json(updated);
}
