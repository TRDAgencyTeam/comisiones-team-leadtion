/**
 * Fechas "de hoy" en hora de Colombia. El servidor (Vercel) corre en UTC: desde
 * las 7 p. m. de Colombia, UTC ya va en el día siguiente (y el último día del mes,
 * en el mes siguiente). Todo "hoy" / "mes actual" debe salir de aquí.
 * Funciona igual en servidor y navegador (no depende de la zona del proceso).
 */
export const ZONA_NEGOCIO = "America/Bogota";

const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_NEGOCIO, year: "numeric", month: "2-digit", day: "2-digit" });

/** Hoy en Colombia, "YYYY-MM-DD". */
export function hoyISO(): string {
  return fmt.format(new Date());
}

/** Mes en curso en Colombia, "YYYY-MM". */
export function mesHoyISO(): string {
  return hoyISO().slice(0, 7);
}
