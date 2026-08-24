import "server-only";
import { consulta } from "@/lib/db";

/** Créditos (amortización). Ahora mismo: Libre Inversión Bancolombia. */

export interface Credito {
  id: number;
  nombre: string;
  montoInicial: number;
  saldo: number;
  tasaEa: number;
  cuota: number;
  plazoMeses: number | null;
  fechaDesembolso: string | null;
  diaPago: string | null;
  interesCorriente: number;
  activo: boolean;
  notas: string | null;
}

const num = (v: unknown): number => (v == null ? 0 : Number(v));
const toISO = (v: unknown): string | null =>
  v == null ? null : v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10);

function mapRow(r: Record<string, unknown>): Credito {
  return {
    id: Number(r.id),
    nombre: String(r.nombre),
    montoInicial: num(r.monto_inicial),
    saldo: num(r.saldo),
    tasaEa: num(r.tasa_ea),
    cuota: num(r.cuota),
    plazoMeses: r.plazo_meses != null ? Number(r.plazo_meses) : null,
    fechaDesembolso: toISO(r.fecha_desembolso),
    diaPago: (r.dia_pago as string) ?? null,
    interesCorriente: num(r.interes_corriente),
    activo: Boolean(r.activo),
    notas: (r.notas as string) ?? null,
  };
}

export async function listarCreditos(): Promise<Credito[]> {
  const rows = await consulta(`select * from public.credito order by activo desc, nombre`);
  return rows.map(mapRow);
}

/** Tasa mensual equivalente a partir de la E.A. */
export function tasaMensual(tasaEa: number): number {
  return Math.pow(1 + tasaEa / 100, 1 / 12) - 1;
}

/** Estima cuántas cuotas faltan para saldar, dado saldo, cuota y tasa E.A. */
export function cuotasRestantes(saldo: number, cuota: number, tasaEa: number): number | null {
  const i = tasaMensual(tasaEa);
  if (cuota <= saldo * i) return null; // la cuota no cubre ni el interés
  // n = -ln(1 - i*saldo/cuota) / ln(1+i)
  const n = -Math.log(1 - (i * saldo) / cuota) / Math.log(1 + i);
  return Math.ceil(n);
}
