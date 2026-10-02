/**
 * Calculadora de retenciones para cuentas de cobro (Colombia) — REG.
 *
 * Réplica EXACTA de la plantilla del usuario (Google Sheet), verificada contra
 * sus casos reales. NO es "server-only": es matemática pura para usarla también
 * en el cliente (cálculo en vivo mientras se digita el valor).
 *
 * - ReteICA  = valor × (tarifa por mil de la actividad CIIU) / 1000.
 * - ReteRenta (Art. 383 ET) sobre base depurada = (valor − aportes) × 75%,
 *   convertida a UVT y aplicada a la tabla marginal. El primer tramo (0–95 UVT)
 *   es 0% según la DIAN: una base ≤ 95 UVT NO retiene. (Antes el umbral estaba
 *   mal en 94, lo que generaba una retención absurda entre 94 y 95 UVT.)
 * - Valor a girar = valor + ICA(negativo) + renta(con signo). Como en la celda
 *   `=B6+E6+F6` del Sheet, donde ICA y renta se guardan con su signo.
 */

/**
 * Tarifa de ICA (por mil) ÚNICA para todos los colaboradores. Verificada contra
 * el Excel del usuario (actividad 7410 "diseño" = 8.66‰). Si cambia, se ajusta
 * aquí en un solo lugar.
 */
export const TARIFA_ICA_DEFAULT = 8.66;

/** UVT (Unidad de Valor Tributario) por año. Ampliable cada año. */
export const UVT_POR_ANIO: Record<number, number> = {
  2024: 47065,
  2025: 49799,
  2026: 52374,
};

/** UVT vigente para un año (cae al más reciente conocido si falta el año). */
export function uvtDeAnio(anio: number): number {
  if (UVT_POR_ANIO[anio]) return UVT_POR_ANIO[anio]!;
  const anios = Object.keys(UVT_POR_ANIO).map(Number).sort((a, b) => b - a);
  return UVT_POR_ANIO[anios[0]!]!;
}

export interface EntradaRetencion {
  /** Valor de la cuenta de cobro (bruto). */
  valor: number;
  /** Tarifa de ICA en "por mil" según la actividad CIIU (ej. 8.66). 0 = sin ICA. */
  tarifaIcaMil: number;
  /** Aportes obligatorios que depuran la base de renta (normalmente 0 aquí). */
  aporteSalud?: number;
  aportePension?: number;
  /** UVT a aplicar (por defecto, la del año en curso). */
  uvt?: number;
}

export interface ResultadoRetencion {
  /** ReteICA con signo (negativo = se descuenta). */
  reteIca: number;
  /** ReteRenta con signo, como la guarda el Sheet (normalmente negativo). */
  reteRenta: number;
  /** Valor a girar = valor + reteIca + reteRenta. */
  valorGirar: number;
  /** Base gravable de renta en UVT (diagnóstico/UX). */
  baseUvt: number;
}

/** Retención de renta "cruda" (resultado del IFS de la plantilla, con su signo). */
function rentaCruda(baseUvt: number, uvt: number): number {
  const u = baseUvt;
  // Tabla Art. 383 ET (base gravable en UVT → impuesto en UVT × valor UVT).
  if (u <= 95) return 0;                                   // 0–95 UVT: 0%
  if (u <= 150) return (u - 95) * 0.19 * uvt;              // >95–150: 19%
  if (u <= 360) return ((u - 150) * 0.28 + 10) * uvt;      // >150–360: 28%
  if (u <= 640) return ((u - 360) * 0.33 + 69) * uvt;      // >360–640: 33%
  if (u <= 945) return ((u - 640) * 0.35 + 162) * uvt;     // >640–945: 35%
  if (u <= 2300) return ((u - 945) * 0.37 + 268) * uvt;    // >945–2300: 37%
  return ((u - 2300) * 0.39 + 770) * uvt;                  // >2300: 39%
}

/** Calcula ICA, renta y valor a girar para una cuenta de cobro. */
export function calcularRetenciones(e: EntradaRetencion): ResultadoRetencion {
  const uvt = e.uvt ?? uvtDeAnio(new Date().getFullYear());
  const salud = e.aporteSalud ?? 0;
  const pension = e.aportePension ?? 0;

  const reteIca = -(e.valor * (e.tarifaIcaMil || 0)) / 1000; // negativo

  const base = (e.valor - salud - pension) * 0.75;
  const baseUvt = uvt > 0 ? base / uvt : 0;
  const reteRenta = -rentaCruda(baseUvt, uvt); // Sheet guarda F6 = -(IFS)

  const valorGirar = e.valor + reteIca + reteRenta;

  return { reteIca, reteRenta, valorGirar, baseUvt };
}
