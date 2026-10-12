import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { z } from "zod";

const importSchema = z.object({
  contacts: z.array(
    z.object({
      name: z.string().min(2),
      phone: z.string().min(10),
      email: z.string().email().optional(),
    })
  ),
});

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const hasToken = !!cookieStore.get("gcal_contact_token");
  if (!hasToken) {
    return NextResponse.json({ error: "Sessão expirada, faça login novamente" }, { status: 401 });
  }

  const body = importSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  let imported = 0;
  let skipped = 0;

  for (const contact of body.data.contacts) {
    const exists = await prisma.client.findUnique({ where: { phone: contact.phone } });
    if (exists) {
      skipped++;
      continue;
    }
    await prisma.client.create({
      data: {
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
      },
    });
    imported++;
  }

  // Limpar token após importação
  const response = NextResponse.json({ imported, skipped });
  response.cookies.delete("gcal_contact_token");
  return response;
}
