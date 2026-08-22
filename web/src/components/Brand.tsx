/* eslint-disable @next/next/no-img-element */
/**
 * Marca Leadtion — usa los archivos oficiales en /brand/.
 * - <LeadtionSymbol/>: el isotipo (cuadrado). Para el loader que palpita usa la
 *   versión blanca sobre el fondo oscuro.
 * - <Logo/>: el imagotipo horizontal (símbolo + "Leadtion"). variant "auto"
 *   cambia negro/blanco según el tema; "light" fuerza blanco (fondos oscuros).
 */

const RATIO = 2.8; // ancho/alto aproximado del imagotipo

export function LeadtionSymbol({
  size = 40,
  color = "black",
  className,
}: {
  size?: number;
  color?: "white" | "black";
  className?: string;
}) {
  const src = color === "white" ? "/brand/leadtion-symbol-white.png" : "/brand/leadtion-symbol-black.png";
  return (
    <img
      src={src}
      alt="Leadtion"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
}

/**
 * Marca TRD (plataforma madre). Usa los archivos oficiales en /brand/trd/.
 * variant "auto" cambia negro/blanco según el tema; "light" fuerza blanco
 * (fondos oscuros); "dark" fuerza negro.
 */
const RATIO_TRD = 2.0; // ancho/alto del imagotipo TRD (2158×1080)

export function TrdLogo({
  height = 28,
  variant = "auto",
}: {
  height?: number;
  variant?: "auto" | "light" | "dark";
}) {
  const style = { height, width: height * RATIO_TRD, objectFit: "contain" as const };
  if (variant === "light") {
    return <img src="/brand/trd/trd-logo-white.png" alt="TRD Investment" style={style} />;
  }
  if (variant === "dark") {
    return <img src="/brand/trd/trd-logo-black.png" alt="TRD Investment" style={style} />;
  }
  return (
    <span className="brand-logo-auto" style={{ display: "inline-flex", height }}>
      <img className="for-light" src="/brand/trd/trd-logo-black.png" alt="TRD Investment" style={style} />
      <img className="for-dark" src="/brand/trd/trd-logo-white.png" alt="TRD Investment" style={style} />
    </span>
  );
}

/** Símbolo TRD (isotipo cuadrado). */
export function TrdSymbol({ size = 40, color = "black" }: { size?: number; color?: "white" | "black" }) {
  const src = color === "white" ? "/brand/trd/trd-symbol-white.png" : "/brand/trd/trd-symbol-black.png";
  return <img src={src} alt="TRD Investment" width={size} height={size} style={{ width: size, height: size, objectFit: "contain" }} />;
}

export function Logo({
  height = 30,
  variant = "auto",
}: {
  height?: number;
  variant?: "auto" | "light" | "dark";
}) {
  const style = { height, width: height * RATIO, objectFit: "contain" as const };
  if (variant === "light") {
    return <img src="/brand/leadtion-logo-white.png" alt="Leadtion" style={style} />;
  }
  if (variant === "dark") {
    return <img src="/brand/leadtion-logo-black.png" alt="Leadtion" style={style} />;
  }
  // auto: negro en claro, blanco en oscuro (CSS decide cuál se muestra)
  return (
    <span className="brand-logo-auto" style={{ display: "inline-flex", height }}>
      <img className="for-light" src="/brand/leadtion-logo-black.png" alt="Leadtion" style={style} />
      <img className="for-dark" src="/brand/leadtion-logo-white.png" alt="Leadtion" style={style} />
    </span>
  );
}
