/**
 * Multa por mora de facturas (puro, cliente + servidor). Regla de Mauro:
 *  - Se cuentan los DÍAS CALENDARIO desde la fecha de factura hasta hoy.
 *  - Los primeros 5 días son de GRACIA (0%). A partir de ahí, +1% por cada bloque
 *    de 5 días, y cualquier bloque empezado cuenta completo (se redondea hacia
 *    arriba): 6–10 días = 1%, 11–15 = 2%, 16–20 = 3%, …
 *  - % = max(0, ceil(días / 5) − 1). Base = valor de la factura SIN IVA (`facturado`).
 *  - Colombia (COL): el IVA se aplica también sobre la multa (base nueva), así que
 *    el valor a cobrar de la multa es base + IVA.
 *  - NO es automático: el admin la agrega a mano; aquí solo se calcula el sugerido.
 */

export const MORA_DIAS_GRACIA = 5; // primeros 5 días sin multa
export const MORA_DIAS_BLOQUE = 5; // cada bloque adicional es de 5 días
export const MORA_PCT_BLOQUE = 1;  // 1% por bloque

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Días calendario de atraso (0 si la factura es de hoy o futura). */
export function diasAtraso(fechaFactura: string, hoy: string): number {
  if (!fechaFactura) return 0;
  const f = new Date(`${fechaFactura.slice(0, 10)}T00:00:00`);
  const h = new Date(`${hoy.slice(0, 10)}T00:00:00`);
  if (isNaN(f.getTime()) || isNaN(h.getTime())) return 0;
  const d = Math.floor((h.getTime() - f.getTime()) / 86_400_000);
  return d > 0 ? d : 0;
}

/** Puntos porcentuales de mora para una cantidad de días de atraso. */
export function porcentajeMora(dias: number): number {
  const bloques = Math.max(0, Math.ceil(dias / MORA_DIAS_BLOQUE) - 1);
  return bloques * MORA_PCT_BLOQUE;
}

export interface CalculoMora {
  dias: number;         // días de atraso
  pct: number;          // puntos % (ej. 2 = 2%)
  baseSinIva: number;   // valor original de la factura sin IVA
  montoSinIva: number;  // multa sin IVA (pct × base)
  iva: number;          // IVA de la multa (0 si la factura no lleva IVA)
  total: number;        // multa a cobrar = montoSinIva + iva
}

/** Multa sugerida de una factura vencida. `facturado` es el valor SIN IVA. */
export function calcularMora(facturado: number, ivaPct: number, fechaFactura: string, hoy: string): CalculoMora {
  const dias = diasAtraso(fechaFactura, hoy);
  const pct = porcentajeMora(dias);
  const base = facturado > 0 ? facturado : 0;
  const montoSinIva = r2(base * (pct / 100));
  const iva = r2(montoSinIva * ((ivaPct || 0) / 100));
  return { dias, pct, baseSinIva: base, montoSinIva, iva, total: r2(montoSinIva + iva) };
}
