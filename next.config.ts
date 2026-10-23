import type { NextConfig } from "next";

/** Host do Supabase Storage, para o next/image aceitar as fotos enviadas pelo app. */
const supabaseUrl = process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL) : null;

const nextConfig: NextConfig = {
  images: {
    /** AVIF primeiro (fotos menores no 4G), WebP para navegador sem AVIF. Ver PERF.md. */
    formats: ["image/avif", "image/webp"],
    ...(supabaseUrl
      ? {
          remotePatterns: [
            {
              protocol: supabaseUrl.protocol.replace(":", "") as "http" | "https",
              hostname: supabaseUrl.hostname,
              pathname: "/storage/v1/object/public/**",
            },
          ],
        }
      : {}),
  },
};

export default nextConfig;
