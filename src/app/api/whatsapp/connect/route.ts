import { NextRequest, NextResponse } from "next/server";
import { getWhatsappQr } from "@/lib/evolution";
import { getVitrineContent } from "@/lib/vitrine-content";

// Conexão do número ao servidor de WhatsApp (rota protegida pelo login).
// ?phone=5516... também devolve o código de 8 letras (conectar sem câmera, no próprio celular).
export async function GET(req: NextRequest) {
  const phone = new URL(req.url).searchParams.get("phone")?.replace(/\D/g, "") || undefined;
  try {
    const result = await getWhatsappQr(phone);
    // Número sugerido para o código: o WhatsApp do Beto cadastrado na página Vitrine.
    const { telefoneWhatsapp } = await getVitrineContent();
    return NextResponse.json({ ...result, defaultPhone: telefoneWhatsapp.replace(/\D/g, "") });
  } catch {
    return NextResponse.json(
      { error: "O servidor de WhatsApp não respondeu. Ele precisa estar no ar para conectar." },
      { status: 503 }
    );
  }
}
