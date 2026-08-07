/**
 * Marca Leadtion. SVG inline (adaptable al tema) usados como PLACEHOLDER con la
 * forma/colores de la marca. Cuando lleguen los archivos oficiales, se
 * reemplazan por <img src="/brand/…"> o se pega el SVG real aquí.
 *
 * - <LeadtionSymbol/>: el isotipo (para el loader que palpita).
 * - <Logo/>: isotipo + palabra "leadtion" (el texto hereda el color del contexto
 *   con currentColor, así se ve bien en claro y oscuro).
 */

export function LeadtionSymbol({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Leadtion"
      className={className}
    >
      <path d="M50 6 C27 6 8 25 8 50 C8 75 27 94 50 94 Z" fill="#2e2a6e" />
      <path d="M50 6 C73 6 92 25 92 50 C92 75 73 94 50 94 Z" fill="#00e5cc" />
      <circle cx="50" cy="50" r="10" fill="#0f1115" opacity="0.15" />
    </svg>
  );
}

export function Logo({ height = 30 }: { height?: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10, height }}>
      <LeadtionSymbol size={height} />
      <span
        style={{
          fontFamily: "Agrandir, sans-serif",
          fontWeight: 700,
          fontSize: height * 0.66,
          letterSpacing: "-0.01em",
          color: "currentColor",
        }}
      >
        leadtion
      </span>
    </span>
  );
}
