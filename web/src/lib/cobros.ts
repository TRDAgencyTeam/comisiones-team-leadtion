import "server-only";
import { consulta } from "@/lib/db";
import { calendarioServicio, type TipoServicio } from "@/lib/servicios";

/**
 * Cobros mensuales por cliente para la vista de cobros de la lista de clientes.
 * LÓGICA (respeta la dinámica de Leadtion):
 *  - Si el mes está DENTRO de la ventana de un servicio (Agente IA / Reactivación),
 *    manda el calendario del servicio: mes 1 full, garantía = $0 (se muestra —),
 *    mes 3 soporte, etc. NO se rellena la garantía.
 *  - Del mes 4 en adelante (fuera de la ventana) la mensualidad es: el SOPORTE
 *    confirmado del cliente si lo tiene, si no la licencia normal ($69). Nunca se
 *    usa valor_licencia_general (que puede traer el precio de la reactivación).
 *  - Agencia con Leadtion incluida → $0 (se cobra por el marketing).
 *  - Un cobro real > 0 se muestra sólido (confirmado); lo proyectado, tenue.
 */

export interface CeldaCobro { mes: string; valor: number; proyectado: boolean }
export interface CobrosMatriz { meses: string[]; porCliente: Map<number, CeldaCobro[]> }

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

function mesMas(ym: string, n: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y!, (m! - 1) + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function cobrosPorCliente(ids: number[], nFuturo = 3): Promise<CobrosMatriz> {
  const hoyYM = new Date().toISOString().slice(0, 7);
  const meses: string[] = [];
  for (let i = 0; i <= nFuturo; i++) meses.push(mesMas(hoyYM, i));
  const finVentana = meses[meses.length - 1]!;
  if (ids.length === 0) return { meses, porCliente: new Map() };

  const [clientes, servicios, soportesInd, pagos] = await Promise.all([
    consulta(`select id, estado_actual, es_agencia, coalesce(soporte_valor,0) sop, to_char(fecha_activacion,'YYYY-MM') act
                from public.clientes where id = any($1::int[])`, [ids]),
    consulta(`select cliente_id, tipo_servicio, to_char(mes_inicio,'YYYY-MM') mes_inicio, soporte_valor, precio_mes1
                from public.cliente_servicios where cliente_id = any($1::int[])`, [ids]),
    consulta(`select cliente_id, valor from public.cliente_soportes where cliente_id = any($1::int[]) and hasta is null`, [ids]),
    consulta(`select cliente_id, to_char(mes,'YYYY-MM') mes, valor from public.pagos_mensuales
               where cliente_id = any($1::int[]) and mes >= $2 and mes <= $3 and valor is not null`,
      [ids, `${meses[0]}-01`, `${finVentana}-01`]),
  ]);

  const pagoDe = new Map<string, number>();
  for (const p of pagos) pagoDe.set(`${p.cliente_id}|${p.mes}`, Number(p.valor));

  // svcDe: meses cubiertos por un servicio (con su valor de calendario, 0 = garantía).
  const svcDe = new Map<string, number>();
  for (const sv of servicios) {
    const cal = calendarioServicio(sv.tipo_servicio as TipoServicio, sv.soporte_valor == null ? null : Number(sv.soporte_valor), sv.precio_mes1 == null ? null : Number(sv.precio_mes1));
    for (const c of cal) {
      const mes = mesMas(String(sv.mes_inicio), c.offset);
      if (mes >= meses[0]! && mes <= finVentana) {
        const k = `${sv.cliente_id}|${mes}`;
        svcDe.set(k, (svcDe.get(k) ?? 0) + c.valor);
      }
    }
  }

  // Soporte indefinido (fallback si no está en clientes.soporte_valor).
  const sopIndDe = new Map<number, number>();
  for (const s of soportesInd) sopIndDe.set(Number(s.cliente_id), Number(s.valor));

  interface Info { activo: boolean; base: number; act: string | null }
  const infoDe = new Map<number, Info>();
  for (const c of clientes) {
    const sop = Number(c.sop) > 0 ? Number(c.sop) : (sopIndDe.get(Number(c.id)) ?? 0);
    const base = sop > 0 ? sop : (Boolean(c.es_agencia) ? 0 : 69);
    infoDe.set(Number(c.id), { activo: String(c.estado_actual) === "activo", base, act: c.act ? String(c.act) : null });
  }

  const porCliente = new Map<number, CeldaCobro[]>();
  for (const id of ids) {
    const info = infoDe.get(id);
    porCliente.set(id, meses.map((mes) => {
      const real = pagoDe.get(`${id}|${mes}`);
      const svc = svcDe.get(`${id}|${mes}`);
      let valor = 0; let confirmado = false;
      if (real != null && real > 0) { valor = real; confirmado = true; }          // cobro real
      else if (svc !== undefined) valor = svc;                                     // servicio (0 = garantía)
      else if (info?.activo && (info.act == null || mes >= info.act)) valor = info.base; // mensualidad base
      return { mes, valor: round2(valor), proyectado: !confirmado };
    }));
  }
  return { meses, porCliente };
}
