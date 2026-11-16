import type { ReactNode } from "react";

/**
 * Ícono "?" con popup informativo al pasar el cursor (o enfocar). Para reemplazar
 * los párrafos explicativos largos: la info vive aquí y aparece solo si se pide.
 * Patrón estándar de la plataforma.
 */
export function InfoTip({ children, titulo, ancho }: { children: ReactNode; titulo?: string; ancho?: number }) {
  return (
    <span className="infotip" tabIndex={0} role="note" aria-label={titulo ?? "Más información"}>
      <span className="infotip-ic" aria-hidden>?</span>
      <span className="infotip-pop" style={ancho ? { width: ancho } : undefined}>{children}</span>
    </span>
  );
}
