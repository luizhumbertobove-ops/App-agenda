import type { Metadata, Viewport } from "next";
import { DM_Sans, Spectral } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });
const spectral = Spectral({
  subsets: ["latin"],
  weight: ["300", "400"],
  style: ["normal", "italic"],
  variable: "--font-spectral",
  // Sem preload: as 4 variações não disputam banda com a foto do topo, e só baixam as usadas. Ver PERF.md.
  preload: false,
});

export const metadata: Metadata = {
  title: "App Beto — Humberto Bove Massoterapeuta",
  description: "Agenda, clientes e pagamentos do consultório",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "App Beto" },
};

export const viewport: Viewport = {
  themeColor: "#855e3e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${dmSans.variable} ${spectral.variable}`}>
      <body className="font-sans bg-gray-50 text-gray-800 antialiased">
        {/* A página rola na janela (não numa caixa): no celular a barra de endereço recolhe,
            o toque no topo sobe a tela e a posição volta certa ao retornar. */}
        <div className="flex min-h-dvh">
          <Sidebar />
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
