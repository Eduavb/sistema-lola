import type { NextConfig } from "next";

const emProducao = process.env.NODE_ENV === "production";

// O Next injeta scripts inline na hidratação, então script-src precisa de 'unsafe-inline'.
// 'unsafe-eval' só no desenvolvimento (React/Turbopack).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${emProducao ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://vitals.vercel-insights.com",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  ...(emProducao ? ["upgrade-insecure-requests"] : []),
].join("; ");

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
