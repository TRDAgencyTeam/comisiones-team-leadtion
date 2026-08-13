/**
 * Motor de comisiones de AFILIADOS (port fiel de la plataforma original).
 *
 * Reglas:
 *  - Cada cliente referido genera comisión durante 3 meses (mes 0,1,2) desde su
 *    fecha de inicio.
 *  - % de licencia por NIVEL según cuántos clientes activos tiene el afiliado en
 *    el bimestre actual: 1-3 => 30%, 4-6 => 40%, 7+ => 50%.
 *  - PARTNER: gana % de licencia × licencia los 3 meses.
 *  - AGENCIA: mes 1 = su % pactado × total de servicios del cliente (si tiene);
 *    si no tiene servicios, % de licencia × licencia. Meses 2 y 3 = % licencia.
 */

export interface Afiliado {
  ref: string;
  nombre: string;
  tipo: "agencia" | "partner";
  comisionAgencia: number | null; // % (agencia); -1/null para partner
}
export interface ClienteAfiliado {
  ref: string;
  nombre: string;
  afiliadoRef: string | null;
  fechaInicio: string | null; // "octubre 2025"
  precioLicencia: number | null;
}
export interface ServicioAfiliado {
  ref: string;
  clienteRef: string | null;
  tipo: string;
  precio: number | null;
}
export interface PagoAfiliado {
  clienteRef: string | null;
  mesNum: number | null;
}

export interface FilaComision {
  clienteRef: string;
  clienteNombre: string;
  afiliadoRef: string;
  afiliadoNombre: string;
  tipo: "agencia" | "partner";
  mesIdx: number; // 0,1,2
  mes: string; // 'YYYY-MM'
  concepto: string;
  pct: number;
  monto: number;
  pagado: boolean;
}

const MONTHS_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const SRV_LABELS: Record<string, string> = {
  reactivacion: "Reactivación", agente_ai: "Agente AI",
  text_ai: "Text AI", voz_ai: "Voz AI", otro: "Personalizado",
};

/** "octubre 2025" -> Date(2025,9,1). */
export function parseMonthKey(s: string | null): Date | null {
  if (!s) return null;
  const p = s.trim().split(" ");
  const mi = MONTHS_ES.indexOf((p[0] ?? "").toLowerCase());
  if (mi === -1 || !p[1]) return null;
  return new Date(parseInt(p[1]), mi, 1);
}
function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}
function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function bimestreStart(now: Date): Date {
  return new Date(now.getFullYear(), Math.floor(now.getMonth() / 2) * 2, 1);
}

export function levelInfo(n: number): { nivel: number; pct: number } {
  if (n <= 3) return { nivel: 1, pct: 0.3 };
  if (n <= 6) return { nivel: 2, pct: 0.4 };
  return { nivel: 3, pct: 0.5 };
}

/** Clientes del afiliado que iniciaron en o después del bimestre actual. */
export function getActiveCount(afRef: string, clientes: ClienteAfiliado[], now: Date): number {
  const bs = bimestreStart(now);
  return clientes.filter((c) => {
    if (c.afiliadoRef !== afRef) return false;
    const d = parseMonthKey(c.fechaInicio);
    return d != null && d >= bs;
  }).length;
}

const money = (n: number) => Math.round(n * 100) / 100;

export function calcComisionesCliente(
  cl: ClienteAfiliado,
  af: Afiliado,
  servicios: ServicioAfiliado[],
  pagos: PagoAfiliado[],
  clientes: ClienteAfiliado[],
  now: Date,
): FilaComision[] {
  const lic = cl.precioLicencia ?? 69;
  const isAgencia = af.tipo === "agencia";
  const licPct = levelInfo(getActiveCount(af.ref, clientes, now)).pct;
  const clSrvs = servicios.filter((s) => s.clienteRef === cl.ref);
  const start = parseMonthKey(cl.fechaInicio);
  if (!start) return [];
  const agPct = af.comisionAgencia && af.comisionAgencia > 0 ? af.comisionAgencia / 100 : null;

  const rows: FilaComision[] = [];
  for (let i = 0; i < 3; i++) {
    const mesDate = addMonths(start, i);
    let concepto: string, monto: number, pct: number;
    if (i === 0 && isAgencia && clSrvs.length > 0) {
      const totalSrv = clSrvs.reduce((s, x) => s + (x.precio ?? 0), 0);
      pct = agPct ?? licPct;
      monto = money(totalSrv * pct);
      const names = clSrvs.map((s) => SRV_LABELS[s.tipo] ?? s.tipo).join(" + ");
      concepto = `${names} (${(pct * 100).toFixed(1)}% / $${totalSrv})`;
    } else {
      pct = licPct;
      monto = money(lic * pct);
      concepto = `Licencia mes ${i + 1} (${(pct * 100).toFixed(0)}%)`;
    }
    const pagado = pagos.some((p) => p.clienteRef === cl.ref && Number(p.mesNum) === i);
    rows.push({
      clienteRef: cl.ref, clienteNombre: cl.nombre, afiliadoRef: af.ref, afiliadoNombre: af.nombre,
      tipo: af.tipo, mesIdx: i, mes: monthKey(mesDate), concepto, pct, monto, pagado,
    });
  }
  return rows;
}

/** Todas las comisiones (3 meses por cliente). */
export function getAllComisiones(
  afiliados: Afiliado[],
  clientes: ClienteAfiliado[],
  servicios: ServicioAfiliado[],
  pagos: PagoAfiliado[],
  now: Date = new Date(),
): FilaComision[] {
  const rows: FilaComision[] = [];
  for (const cl of clientes) {
    const af = afiliados.find((a) => a.ref === cl.afiliadoRef);
    if (!af) continue;
    rows.push(...calcComisionesCliente(cl, af, servicios, pagos, clientes, now));
  }
  return rows;
}
