import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { ActionLoader } from "@/components/ActionLoader";
import { Avisos } from "@/components/Avisos";
import { SCRIPT_TEMA } from "@/lib/tema";

export const metadata: Metadata = {
  title: { template: "%s · TRD Investment", default: "TRD Investment" },
  description: "Plataforma TRD Investment: finanzas de la matriz y Leadtion (membresías, comisiones CS y afiliados).",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Tema elegido (claro/oscuro) antes del primer pintado: sin parpadeo. */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body>
        {children}
        {/* Loader con el logo + avisos "Actualizado", en TODA la plataforma. */}
        <Suspense fallback={null}><ActionLoader /></Suspense>
        <Avisos />
      </body>
    </html>
  );
}
