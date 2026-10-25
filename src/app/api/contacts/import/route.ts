import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { cookies } from "next/headers";
import { z } from "zod";
import { isValidPhone, normalizePhone, phoneVariants } from "@/lib/domain/phone";

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
    // Mesmo número que o cadastro (com ou sem 55, com máscara) não entra duas vezes.
    const phone = normalizePhone(contact.phone);
    if (!isValidPhone(phone)) {
      skipped++;
      continue;
    }
    const exists = await prisma.client.findFirst({ where: { phone: { in: phoneVariants(contact.phone) } } });
    if (exists) {
      skipped++;
      continue;
    }
    try {
      await prisma.client.create({
        data: {
          name: contact.name,
          phone,
          email: contact.email,
        },
      });
      imported++;
    } catch (err) {
      // Mesmo número cadastrado ao mesmo tempo (vitrine, outro aparelho): conta como já existente.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        skipped++;
        continue;
      }
      throw err;
    }
  }

  // Limpar token após importação
  const response = NextResponse.json({ imported, skipped });
  response.cookies.delete("gcal_contact_token");
  return response;
}
