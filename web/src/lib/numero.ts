/**
 * Montos en formato colombiano: punto de miles y coma decimal ("1.234.567,89").
 * Sirve en cliente y servidor. TODO campo de dinero se muestra con `formatoMonto`
 * mientras se escribe y se lee en el servidor con `parseMonto`.
 */

/**
 * Lee un monto escrito por el usuario. Entiende "623.000", "1.234,56", "12,71",
 * "78.46" y "1234". Regla: si hay coma, la coma es el decimal y los puntos son
 * miles. Sin coma: varios puntos = miles; un solo punto seguido de exactamente 3
 * dígitos = miles ("623.000"); si no, es decimal ("78.46").
 */
export function parseMonto(v: unknown): number {
  let s = String(v ?? "").trim().replace(/[^\d.,-]/g, "");
  if (!s) return 0;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(/,/g, ".");
  else {
    const puntos = s.split(".").length - 1;
    if (puntos > 1 || (puntos === 1 && /^\-?\d+\.\d{3}$/.test(s))) s = s.replace(/\./g, "");
  }
  const x = Number(s);
  return Number.isFinite(x) ? x : 0;
}

/**
 * Formatea MIENTRAS se escribe: agrupa miles con punto y deja la coma decimal
 * (máx. 2 decimales). Un "." escrito al final se toma como coma decimal.
 * `decimales=false` para montos enteros (COP).
 */
export function formatoMonto(raw: string, decimales = true): string {
  let s = String(raw ?? "");
  const neg = s.trim().startsWith("-");
  // "12." recién tecleado (sin coma aún) → el punto es la coma decimal.
  if (decimales && !s.includes(",") && s.endsWith(".")) s = s.slice(0, -1) + ",";
  let [ent = "", dec] = s.split(",");
  ent = ent.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  const entFmt = ent ? ent.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : (dec !== undefined ? "0" : "");
  let out = entFmt;
  if (decimales && dec !== undefined) out += "," + dec.replace(/\D/g, "").slice(0, 2);
  return (neg && out ? "-" : "") + out;
}

/** Número guardado → texto para el campo ("1234.5" → "1.234,5"). */
export function montoATexto(n: number | string | null | undefined, decimales = true): string {
  if (n == null || n === "") return "";
  const x = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(x)) return "";
  return x.toLocaleString("es-CO", { maximumFractionDigits: decimales ? 2 : 0, useGrouping: true });
}
