import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Comisiones CS — LEADTION",
  description: "Cálculo de comisiones del equipo de Customer Success (TRD Agency).",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
