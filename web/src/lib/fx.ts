import "server-only";

/**
 * Tasa USD→COP en vivo (para convertir la nómina y egresos). Se refresca en cada
 * carga: solo se reutiliza el valor en memoria durante una ventana muy corta (TTL)
 * para no golpear la API varias veces dentro de un mismo render. Si la API falla,
 * usa el último valor conocido y, si no hay, un respaldo razonable.
 */
declare global {
  // eslint-disable-next-line no-var
  var _fxCache: { ts: number; cop: number } | undefined;
}

const RESPALDO_COP = 3150;
/** Ventana de reutilización en memoria (ms). Corta: refresca casi en cada carga
 *  sin disparar varias peticiones dentro del mismo render. */
const TTL_MS = 2 * 60 * 1000; // 2 minutos

export async function tasaUsdCop(): Promise<{ cop: number; fecha: string; enVivo: boolean }> {
  const hoy = new Date().toISOString().slice(0, 10);
  const ahora = Date.now();
  // Reutiliza solo si el último valor es muy reciente (evita refetch en cascada).
  if (global._fxCache && ahora - global._fxCache.ts < TTL_MS) {
    return { cop: global._fxCache.cop, fecha: hoy, enVivo: true };
  }
  try {
    // `no-store`: siempre pide el valor actual (sin caché de datos de Next).
    const r = await fetch("https://open.er-api.com/v6/latest/USD", { cache: "no-store" });
    const j = await r.json();
    const cop = Number(j?.rates?.COP);
    if (cop > 0) {
      global._fxCache = { ts: ahora, cop };
      return { cop, fecha: hoy, enVivo: true };
    }
  } catch {
    // cae al último conocido / respaldo
  }
  // Si la API falla, usa el último valor conocido antes que el respaldo fijo.
  if (global._fxCache) return { cop: global._fxCache.cop, fecha: hoy, enVivo: true };
  return { cop: RESPALDO_COP, fecha: hoy, enVivo: false };
}
