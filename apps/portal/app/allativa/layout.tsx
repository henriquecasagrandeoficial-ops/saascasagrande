import type { Metadata } from "next";
import { Manrope, Playfair_Display } from "next/font/google";

import "@allativa/globals.css";

const manrope = Manrope({
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
  title: "Sistema de Joias — Painel",
  description: "Painel administrativo do Sistema de Joias.",
};

export default function AllativaLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
      className={`${manrope.variable} ${playfair.variable} font-sans antialiased`}
    >
      {children}
    </div>
  );
}
