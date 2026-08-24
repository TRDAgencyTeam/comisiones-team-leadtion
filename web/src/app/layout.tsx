import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { template: "%s · TRD Investment", default: "TRD Investment" },
  description: "Plataforma TRD Investment: finanzas de la matriz y Leadtion (membresías, comisiones CS y afiliados).",
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
