import "server-only";
import { consulta } from "@/lib/db";
import { tasaUsdCop } from "@/lib/fx";

/**
 * Historial diario de la tasa USD→COP (tabla fx_diario). Sirve para mostrar la
 * tasa "en vivo" en REG y ver la fluctuación de los últimos días.
 */

export interface PuntoFx {
  fecha: string; // YYYY-MM-DD
  cop: number;
  delta: number | null; // variación COP vs. el día anterior de la serie
}

const toISO = (v: unknown): string =>
  v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10);

/** Fecha (YYYY-MM-DD) hace n días respecto de hoy (UTC). */
function fechaMenos(dias: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - dias);
  return d.toISOString().slice(0, 10);
}

/** Guarda/actualiza la tasa en vivo de hoy en el historial. Best-effort. */
export async function snapshotTasaHoy(): Promise<void> {
  try {
    const { cop, fecha, enVivo } = await tasaUsdCop();
    await consulta(
      `insert into public.fx_diario (fecha, cop, fuente) values ($1,$2,$3)
         on conflict (fecha) do update set cop = excluded.cop, fuente = excluded.fuente`,
      [fecha, cop, enVivo ? "en_vivo" : "respaldo"],
    );
  } catch {
    // el historial es informativo; nunca romper la página por esto
  }
}

/**
 * Rellena los días faltantes del historial (últimos `dias`) desde la API
 * histórica de tasas (fawaz currency-api). Best-effort: si algún día falla, sigue.
 */
export async function backfillFx(dias = 4): Promise<void> {
  try {
    const objetivo: string[] = [];
    for (let i = 0; i < dias; i++) objetivo.push(fechaMenos(i));
    const existentes = await consulta(
      `select to_char(fecha,'YYYY-MM-DD') f from public.fx_diario where fecha >= $1`,
      [objetivo[objetivo.length - 1]],
    );
    const yaHay = new Set(existentes.map((r: Record<string, unknown>) => String(r.f)));
    for (const f of objetivo) {
      if (yaHay.has(f)) continue;
      try {
        const url = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${f}/v1/currencies/usd.json`;
        const r = await fetch(url, { next: { revalidate: 86400 } });
        const j = await r.json();
        const cop = Number(j?.usd?.cop);
        if (cop > 0) {
          await consulta(
            `insert into public.fx_diario (fecha, cop, fuente) values ($1,$2,'historico')
               on conflict (fecha) do nothing`,
            [f, Math.round(cop * 10000) / 10000],
          );
        }
      } catch {
        // día sin dato: se omite
      }
    }
  } catch {
    // no romper por el backfill
  }
}

/** Últimos n días del historial (más reciente primero), con la variación diaria. */
export async function historialFx(n = 3): Promise<PuntoFx[]> {
  const rows = await consulta(
    `select fecha, cop from public.fx_diario order by fecha desc limit $1`,
    [n + 1],
  );
  const serie = rows.map((r: Record<string, unknown>) => ({ fecha: toISO(r.fecha), cop: Number(r.cop) }));
  const out: PuntoFx[] = [];
  for (let i = 0; i < serie.length && i < n; i++) {
    const hoy = serie[i]!;
    const previo = serie[i + 1];
    out.push({ fecha: hoy.fecha, cop: hoy.cop, delta: previo ? Math.round((hoy.cop - previo.cop) * 100) / 100 : null });
  }
  return out;
}
