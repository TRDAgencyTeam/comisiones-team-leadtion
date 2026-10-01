/**
 * Se ejecuta una vez al arrancar el servidor. Fija la zona horaria del proceso a
 * Colombia para que `new Date().getMonth()` y similares den el mes/día del negocio
 * (Vercel corre en UTC y el 30 a las 7 p. m. ya "era" el mes siguiente).
 * Las fechas "hoy" explícitas usan además `@/lib/fecha` (no dependen de esto).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") process.env.TZ = "America/Bogota";
}
