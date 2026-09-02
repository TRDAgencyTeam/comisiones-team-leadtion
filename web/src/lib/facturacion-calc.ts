/** Cálculo de facturación (puro, cliente+servidor). Verificado con el Excel. */

export const MEDIOS = [
  { value: "stripe", label: "Stripe" },
  { value: "zelle", label: "Zelle" },
  { value: "bancolombia", label: "Bancolombia" },
  { value: "nequi", label: "Nequi" },
  { value: "otro", label: "Otro" },
];

export const ESTADOS = [
  { value: "pagado", label: "Pagado" },
  { value: "facturado", label: "Facturado" },
  { value: "por_facturar", label: "Por facturar" },
  { value: "por_confirmar", label: "¿Continúa?" },
  { value: "programado", label: "Programado" },
  { value: "anulado", label: "Anulado" },
];
export const ESTADO_LABEL: Record<string, string> = Object.fromEntries(ESTADOS.map((e) => [e.value, e.label]));

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Comisión de pasarela: Stripe 2,9% + $0,30; los demás medios = 0. */
export function pasarela(facturado: number, medio: string | null): number {
  if (medio === "stripe" && facturado > 0) return r2(facturado * 0.029 + 0.3);
  return 0;
}

/** LLC (USD): neto = facturado − pasarela. */
export function calcLLC(facturado: number, medio: string | null) {
  const p = pasarela(facturado, medio);
  return { pasarela: p, neto: r2(facturado - p) };
}

/** COL (COP): IVA sobre el valor antes de IVA; neto agencia USD = antes de IVA ÷ tasa. */
export function calcCOL(facturadoCop: number, ivaPct: number, tasa: number) {
  const iva = r2(facturadoCop * (ivaPct / 100));
  return { iva, copConIva: r2(facturadoCop + iva), netoUsd: tasa > 0 ? r2(facturadoCop / tasa) : 0 };
}
