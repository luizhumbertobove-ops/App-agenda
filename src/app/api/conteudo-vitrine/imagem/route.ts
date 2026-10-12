import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { vitrineCampo } from "@/lib/vitrine-content";
import { ArmazenamentoError, ImagemInvalidaError, uploadVitrineImage } from "@/lib/storage";

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Envio inválido." }, { status: 400 });
  }

  const key = form.get("key");
  const file = form.get("file");

  const campo = typeof key === "string" ? vitrineCampo(key) : undefined;
  if (!campo || campo.type !== "image") {
    return NextResponse.json({ error: "Campo de imagem inválido." }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Escolha uma imagem para enviar." }, { status: 400 });
  }

  let url: string;
  try {
    url = await uploadVitrineImage(campo.key, file);
  } catch (erro) {
    if (erro instanceof ImagemInvalidaError) {
      return NextResponse.json({ error: erro.message }, { status: 400 });
    }
    if (erro instanceof ArmazenamentoError) {
      return NextResponse.json({ error: erro.message }, { status: 500 });
    }
    console.error("Erro inesperado ao enviar imagem da vitrine:", erro);
    return NextResponse.json({ error: "Não foi possível enviar a imagem. Tente de novo." }, { status: 500 });
  }

  await prisma.vitrineContent.upsert({
    where: { key: campo.key },
    create: { key: campo.key, value: url },
    update: { value: url },
  });

  revalidatePath("/vitrine");
  return NextResponse.json({ url });
}
