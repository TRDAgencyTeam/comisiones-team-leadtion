import "server-only";
import { consulta } from "@/lib/db";
import { calendarioServicio, type TipoServicio } from "@/lib/servicios";

/**
 * Proyección de cobros mensuales por cliente (vista tipo Excel): para el mes en
 * curso y los próximos, cuánto se le cobra a cada miembro Leadtion. Usa los pagos
 * ya generados (pagos_mensuales) para el pasado/actual y proyecta hacia adelante
 * con la misma lógica de servicios + soportes de Membresías.
 */

export interface CeldaCobro { mes: string; valor: number; proyectado: boolean }
export interface FilaCobro {
  id: number; nombre: string; estado: string; corteDia: number | null;
  celdas: CeldaCobro[]; total: number;
}
export interface Proyeccion { meses: string[]; filas: FilaCobro[]; totalesPorMes: number[] }

const toYM = (v: unknown): string => (v instanceof Date ? v.toISOString() : String(v)).slice(0, 7);
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** 'YYYY-MM' + n meses → 'YYYY-MM'. */
function mesMas(ym: string, n: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y!, (m! - 1) + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
function mesesEntre(desdeYM: string, hastaYM: string): string[] {
  const out: string[] = [];
  let cur = desdeYM; let guard = 0;
  while (cur <= hastaYM && guard++ < 360) { out.push(cur); cur = mesMas(cur, 1); }
  return out;
}

export async function proyeccionCobros(nFuturo = 3): Promise<Proyeccion> {
  const hoyYM = new Date().toISOString().slice(0, 7);
  const meses: string[] = [];
  for (let i = 0; i <= nFuturo; i++) meses.push(mesMas(hoyYM, i));
  const finVentana = meses[meses.length - 1]!;

  const [clientes, servicios, soportes, pagos] = await Promise.all([
    consulta(`select id, nombre, estado_actual, fecha_activacion from public.clientes
               where es_leadtion and estado_actual <> 'cancelado' order by nombre`),
    consulta(`select cliente_id, tipo_servicio, to_char(mes_inicio,'YYYY-MM') mes_inicio, soporte_valor, precio_mes1 from public.cliente_servicios`),
    consulta(`select cliente_id, valor, to_char(desde,'YYYY-MM') desde, to_char(hasta,'YYYY-MM') hasta from public.cliente_soportes`),
    consulta(`select cliente_id, to_char(mes,'YYYY-MM') mes, valor from public.pagos_mensuales
               where mes >= $1 and mes <= $2 and valor is not null`, [`${meses[0]}-01`, `${finVentana}-01`]),
  ]);

  // pagos reales por cliente/mes
  const pagoDe = new Map<string, number>();
  for (const p of pagos) pagoDe.set(`${p.cliente_id}|${p.mes}`, Number(p.valor));

  // proyección esperada por cliente/mes (soportes + servicios; servicio pisa soporte)
  const espDe = new Map<string, number>();
  for (const s of soportes) {
    const desde = String(s.desde); const hasta = s.hasta ? String(s.hasta) : finVentana;
    for (const mes of mesesEntre(desde > meses[0]! ? desde : meses[0]!, hasta < finVentana ? hasta : finVentana)) {
      espDe.set(`${s.cliente_id}|${mes}`, Number(s.valor));
    }
  }
  for (const sv of servicios) {
    const cal = calendarioServicio(sv.tipo_servicio as TipoServicio, sv.soporte_valor == null ? null : Number(sv.soporte_valor), sv.precio_mes1 == null ? null : Number(sv.precio_mes1));
    for (const c of cal) {
      const mes = mesMas(String(sv.mes_inicio), c.offset);
      if (mes >= meses[0]! && mes <= finVentana) espDe.set(`${sv.cliente_id}|${mes}`, (espDe.get(`${sv.cliente_id}|${mes}`) ?? 0) + c.valor);
    }
  }

  const totalesPorMes = meses.map(() => 0);
  const filas: FilaCobro[] = clientes.map((c) => {
    const id = Number(c.id);
    const fa = c.fecha_activacion ? (c.fecha_activacion instanceof Date ? c.fecha_activacion.toISOString() : String(c.fecha_activacion)) : null;
    const celdas: CeldaCobro[] = meses.map((mes, i) => {
      const real = pagoDe.get(`${id}|${mes}`);
      const esp = espDe.get(`${id}|${mes}`) ?? 0;
      const valor = real != null ? real : esp;
      totalesPorMes[i]! += valor;
      return { mes, valor: round2(valor), proyectado: real == null && mes > hoyYM };
    });
    return {
      id, nombre: String(c.nombre), estado: String(c.estado_actual),
      corteDia: fa ? Number(fa.slice(8, 10)) : null,
      celdas, total: round2(celdas.reduce((s, x) => s + x.valor, 0)),
    };
  }).filter((f) => f.total > 0);

  return { meses, filas, totalesPorMes: totalesPorMes.map(round2) };
}
