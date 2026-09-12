import "server-only";
import { consulta } from "@/lib/db";
import { calendarioServicio, type TipoServicio } from "@/lib/servicios";

/**
 * Cobros mensuales por cliente para la VISTA de cobros de la lista de clientes:
 * mes en curso + próximos, cuánto se le cobra a cada uno. Usa pagos_mensuales para
 * lo real y proyecta hacia adelante con servicios + soportes (misma lógica de
 * Membresías). Devuelve un mapa por id para alinearlo con la lista ya filtrada.
 */

export interface CeldaCobro { mes: string; valor: number; proyectado: boolean }
export interface CobrosMatriz { meses: string[]; porCliente: Map<number, CeldaCobro[]> }

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

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

export async function cobrosPorCliente(ids: number[], nFuturo = 3): Promise<CobrosMatriz> {
  const hoyYM = new Date().toISOString().slice(0, 7);
  const meses: string[] = [];
  for (let i = 0; i <= nFuturo; i++) meses.push(mesMas(hoyYM, i));
  const finVentana = meses[meses.length - 1]!;
  if (ids.length === 0) return { meses, porCliente: new Map() };

  const [servicios, soportes, pagos] = await Promise.all([
    consulta(`select cliente_id, tipo_servicio, to_char(mes_inicio,'YYYY-MM') mes_inicio, soporte_valor, precio_mes1
                from public.cliente_servicios where cliente_id = any($1::int[])`, [ids]),
    consulta(`select cliente_id, valor, to_char(desde,'YYYY-MM') desde, to_char(hasta,'YYYY-MM') hasta
                from public.cliente_soportes where cliente_id = any($1::int[])`, [ids]),
    consulta(`select cliente_id, to_char(mes,'YYYY-MM') mes, valor from public.pagos_mensuales
               where cliente_id = any($1::int[]) and mes >= $2 and mes <= $3 and valor is not null`,
      [ids, `${meses[0]}-01`, `${finVentana}-01`]),
  ]);

  const pagoDe = new Map<string, number>();
  for (const p of pagos) pagoDe.set(`${p.cliente_id}|${p.mes}`, Number(p.valor));

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

  const porCliente = new Map<number, CeldaCobro[]>();
  for (const id of ids) {
    porCliente.set(id, meses.map((mes) => {
      const real = pagoDe.get(`${id}|${mes}`);
      const esp = espDe.get(`${id}|${mes}`) ?? 0;
      return { mes, valor: round2(real != null ? real : esp), proyectado: real == null && mes > hoyYM };
    }));
  }
  return { meses, porCliente };
}
