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
        {/* Poppins: tipografía de los contratos (y disponible en toda la plataforma). */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Dancing+Script:wght@600&family=Great+Vibes&family=Sacramento&display=swap" />
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
