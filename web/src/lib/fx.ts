import "server-only";

/**
 * Tasa USD→COP del día (para convertir la nómina). Se cachea en memoria por día;
 * si la API falla, usa un valor de respaldo razonable.
 */
declare global {
  // eslint-disable-next-line no-var
  var _fxCache: { fecha: string; cop: number } | undefined;
}

const RESPALDO_COP = 3150;

export async function tasaUsdCop(): Promise<{ cop: number; fecha: string; enVivo: boolean }> {
  const hoy = new Date().toISOString().slice(0, 10);
  if (global._fxCache?.fecha === hoy) {
    return { cop: global._fxCache.cop, fecha: hoy, enVivo: true };
  }
  try {
    const r = await fetch("https://open.er-api.com/v6/latest/USD", { next: { revalidate: 3600 } });
    const j = await r.json();
    const cop = Number(j?.rates?.COP);
    if (cop > 0) {
      global._fxCache = { fecha: hoy, cop };
      return { cop, fecha: hoy, enVivo: true };
    }
  } catch {
    // cae al respaldo
  }
  return { cop: RESPALDO_COP, fecha: hoy, enVivo: false };
}
