import type { Metadata } from "next";
import { Instrument_Sans, Geist_Mono } from "next/font/google";
import { ProvedorTema } from "@/components/tema";
import { Toaster } from "@/components/toaster";
import "./globals.css";

const fonteTexto = Instrument_Sans({
  subsets: ["latin"],
  variable: "--fonte-texto",
});

const fonteMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--fonte-mono",
});

export const metadata: Metadata = {
  title: "Revelio",
  description:
    "Le o contrato, calcula as datas que ninguem calculou, e cobra sozinho.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${fonteTexto.variable} ${fonteMono.variable}`}
    >
      <body>
        <ProvedorTema>
          {children}
          <Toaster />
        </ProvedorTema>
      </body>
    </html>
  );
}
