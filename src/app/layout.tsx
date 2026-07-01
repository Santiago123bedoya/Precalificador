import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IA-COOP Precalificador",
  description: "Precalificador Crediticio Ético Inteligente",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}