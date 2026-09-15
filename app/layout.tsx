import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { BRAND } from "@/lib/brand.config";
import { CartProvider } from "@/lib/cart";

export const metadata: Metadata = {
  title: `${BRAND.nome} — Loja`,
  description: `${BRAND.nome} — ${BRAND.tagline}.`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Fontes carregadas via <link> global de propósito: são usadas em todas
            as rotas e a troca de identidade visual passa por brand.config + CSS vars. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>
        <CartProvider>{children}</CartProvider>
        <Analytics />
      </body>
    </html>
  );
}
