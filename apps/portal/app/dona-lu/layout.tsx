import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";

import "@dona-lu/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sistema de Confeitaria — Painel",
  description: "Painel administrativo do Sistema de Confeitaria.",
};

export default function DonaLuLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={`${inter.variable} ${playfair.variable} font-sans antialiased`}>
      {children}
    </div>
  );
}
