import { NextResponse } from "next/server";
import { getWhatsappQr } from "@/lib/evolution";

// QR code para ligar o número do Beto ao servidor de WhatsApp (rota protegida pelo login).
export async function GET() {
  try {
    return NextResponse.json(await getWhatsappQr());
  } catch {
    return NextResponse.json(
      { error: "O servidor de WhatsApp não respondeu. Ele precisa estar no ar para conectar." },
      { status: 503 }
    );
  }
}
