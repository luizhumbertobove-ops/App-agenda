import { NextResponse } from "next/server";
import { isWhatsappOnline } from "@/lib/evolution";

/** O envio automático de WhatsApp está funcionando agora? */
export async function GET() {
  return NextResponse.json({ online: await isWhatsappOnline() });
}
