import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  manifest: "/vitrine/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Bove Massoterapeuta" },
  icons: {
    icon: [{ url: "/vitrine/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/vitrine/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#855E3E",
  width: "device-width",
  initialScale: 1,
};

export default function VitrineLayout({ children }: { children: React.ReactNode }) {
  return children;
}
