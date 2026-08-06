/**
 * Utilidades de fecha para el motor de comisiones.
 *
 * Todas las fechas son 'YYYY-MM-DD' y se tratan como fechas calendario puras
 * (sin hora ni zona horaria) para evitar corrimientos por UTC. La aritmética de
 * meses de los hitos es CALENDARIO: "mes 4 del cliente" = activación + 3 meses
 * exactos (mismo día). Ej.: Yolanda activada 2026-05-11 → hito T1 el 2026-08-11.
 */

import type { ISODate } from "./types.js";

/** Parte una ISODate en [año, mes(1-12), día]. */
function parts(iso: ISODate): [number, number, number] {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) throw new Error(`Fecha ISO inválida: ${iso}`);
  return [y, m, d];
}

/** Formatea [año, mes(1-12), día] a 'YYYY-MM-DD'. */
function fmt(y: number, m: number, d: number): ISODate {
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${p(y, 4)}-${p(m)}-${p(d)}`;
}

/** Días en un mes calendario (m: 1-12). */
function diasEnMes(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/**
 * Suma `n` meses calendario a una fecha, fijando el día. Si el día no existe en
 * el mes destino (ej. 31 → mes de 30), usa el último día de ese mes.
 */
export function addMonths(iso: ISODate, n: number): ISODate {
  const [y, m, d] = parts(iso);
  const total = (y * 12 + (m - 1)) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const nd = Math.min(d, diasEnMes(ny, nm));
  return fmt(ny, nm, nd);
}

/** Compara dos fechas ISO. Devuelve <0, 0 o >0. Seguro lexicográficamente. */
export function cmp(a: ISODate, b: ISODate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** a >= b */
export function gte(a: ISODate, b: ISODate): boolean {
  return cmp(a, b) >= 0;
}

/** a < b */
export function lt(a: ISODate, b: ISODate): boolean {
  return cmp(a, b) < 0;
}

/** Diferencia en días completos entre dos fechas (b - a). */
export function diffDias(a: ISODate, b: ISODate): number {
  const [ay, am, ad] = parts(a);
  const [by, bm, bd] = parts(b);
  const ta = Date.UTC(ay, am - 1, ad);
  const tb = Date.UTC(by, bm - 1, bd);
  return Math.round((tb - ta) / 86_400_000);
}
