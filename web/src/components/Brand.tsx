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
