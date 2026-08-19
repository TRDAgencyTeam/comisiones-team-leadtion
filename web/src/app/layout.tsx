import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { template: "%s · Leadtion", default: "Leadtion" },
  description: "Plataforma Leadtion (TRD Agency): membresías, comisiones CS y afiliados.",
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
