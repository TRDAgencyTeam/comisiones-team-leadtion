"use client";
export function ImprimirBtn({ className = "btn-secondary", children = "Descargar / Imprimir" }: { className?: string; children?: React.ReactNode }) {
  return <button type="button" className={className} onClick={() => window.print()}>{children}</button>;
}
