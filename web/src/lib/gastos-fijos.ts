import "server-only";
import { consulta } from "@/lib/db";
import { tasaUsdCop } from "@/lib/fx";
import type { GastoFijo, CategoriaGasto, Recurrencia } from "@/lib/gastos-tipos";

/** Gastos fijos no-nómina + resumen mensual (COP y USD) de TODOS los gastos fijos. */

export type { GastoFijo, CategoriaGasto, Recurrencia } from "@/lib/gastos-tipos";
export { CATEGORIA_LABEL, RECURRENCIA_LABEL } from "@/lib/gastos-tipos";

const num = (v: unknown): number => (v == null ? 0 : Number(v));

function mapRow(r: Record<string, unknown>): GastoFijo {
  return {
    id: Number(r.id),
    categoria: r.categoria as CategoriaGasto,
    nombre: String(r.nombre),
    moneda: (r.moneda as "COP" | "USD") ?? "COP",
    valor: num(r.valor),
    recurrencia: (r.recurrencia as Recurrencia) ?? "mensual",
    diaCobro: r.dia_cobro != null ? Number(r.dia_cobro) : null,
    metodoPago: (r.metodo_pago as string) ?? null,
    porcentajeReparto: r.porcentaje_reparto != null ? Number(r.porcentaje_reparto) : 100,
    amortizar: Boolean(r.amortizar),
    afectaUtilidad: Boolean(r.afecta_utilidad),
    activo: Boolean(r.activo),
    notas: (r.notas as string) ?? null,
  };
}

export async function listarGastos(): Promise<GastoFijo[]> {
  const rows = await consulta(
    `select * from public.gasto_fijo order by categoria, nombre`,
  );
  return rows.map(mapRow);
}

export async function obtenerGasto(id: number): Promise<GastoFijo | null> {
  const rows = await consulta(`select * from public.gasto_fijo where id = $1`, [id]);
  return rows.length ? mapRow(rows[0]!) : null;
}

/** Valor mensual en COP de un gasto (aplica moneda, recurrencia y % de reparto). */
export function valorMensualCop(g: GastoFijo, tasa: number): number {
  let base = g.moneda === "USD" ? g.valor * tasa : g.valor;
  if (g.recurrencia === "anual") base = base / 12;
  else if (g.recurrencia === "diario") base = base * 30;
  return Math.round(base * (g.porcentajeReparto / 100));
}

/** Desglose de un gasto en día/mes/año, en COP y USD (aplica recurrencia y reparto). */
export function periodos(g: GastoFijo, tasa: number) {
  let mMon = g.recurrencia === "anual" ? g.valor / 12 : g.recurrencia === "diario" ? g.valor * 30 : g.valor;
  mMon = mMon * (g.porcentajeReparto / 100);
  const mesCop = g.moneda === "USD" ? mMon * tasa : mMon;
  const mesUsd = g.moneda === "USD" ? mMon : tasa > 0 ? mMon / tasa : 0;
  return {
    diaCop: mesCop / 30, mesCop, anualCop: mesCop * 12,
    diaUsd: mesUsd / 30, mesUsd, anualUsd: mesUsd * 12,
  };
}

export interface ResumenGastosFijos {
  tasa: number;
  porCategoria: Record<CategoriaGasto, number>; // COP/mes (solo afecta utilidad, salvo paso_dinero informativo)
  nomina: number;
  credito: number;
  pasoDinero: number; // informativo, NO suma al total
  totalCop: number;
  totalUsd: number;
}

export async function resumenGastosFijos(): Promise<ResumenGastosFijos> {
  const [gastos, fx, nominaRow, creditoRow] = await Promise.all([
    listarGastos(),
    tasaUsdCop(),
    consulta(`select coalesce(sum(valor_nomina),0) as t from public.colaboradores where activo`),
    consulta(`select coalesce(sum(cuota),0) as t from public.credito where activo`),
  ]);
  const tasa = fx.cop;

  const porCategoria: Record<CategoriaGasto, number> = {
    servicio_publico: 0, otro: 0, herramienta: 0, hosting: 0, paso_dinero: 0,
  };
  for (const g of gastos) {
    if (!g.activo) continue;
    porCategoria[g.categoria] += valorMensualCop(g, tasa);
  }

  const nomina = Number(nominaRow[0]!.t);
  const credito = Number(creditoRow[0]!.t);
  const pasoDinero = porCategoria.paso_dinero;

  // El total NO incluye "paso de dinero" (no es gasto real de la empresa).
  const totalCop =
    porCategoria.servicio_publico + porCategoria.otro + porCategoria.herramienta +
    porCategoria.hosting + nomina + credito;

  return { tasa, porCategoria, nomina, credito, pasoDinero, totalCop, totalUsd: tasa > 0 ? totalCop / tasa : 0 };
}

/** Nómina activa agrupada por área (departamento), en COP. */
export async function nominaPorArea(): Promise<{ area: string; count: number; cop: number }[]> {
  const rows = await consulta(
    `select coalesce(area,'—') as area, count(*)::int as n, coalesce(sum(valor_nomina),0) as cop
       from public.colaboradores where activo group by coalesce(area,'—') order by cop desc`,
  );
  return rows.map((r: Record<string, unknown>) => ({ area: String(r.area), count: Number(r.n), cop: Number(r.cop) }));
}

export interface SnapshotGasto { mes: string; totalCop: number; totalUsd: number }

/** Histórico de snapshots mensuales (más reciente primero). */
export async function listarSnapshots(): Promise<SnapshotGasto[]> {
  const rows = await consulta(
    `select mes, total_cop, total_usd from public.gasto_fijo_snapshot order by mes desc limit 24`,
  );
  return rows.map((r: Record<string, unknown>) => ({
    mes: r.mes instanceof Date ? r.mes.toISOString().slice(0, 7) : String(r.mes).slice(0, 7),
    totalCop: Number(r.total_cop),
    totalUsd: Number(r.total_usd),
  }));
}

/** Guarda (upsert) el snapshot del total de gastos fijos del mes en curso. */
export async function guardarSnapshotMesActual(): Promise<void> {
  const r = await resumenGastosFijos();
  const hoy = new Date();
  const mes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-01`;
  await consulta(
    `insert into public.gasto_fijo_snapshot (mes, total_cop, total_usd, tasa)
     values ($1,$2,$3,$4)
     on conflict (mes) do update set total_cop=$2, total_usd=$3, tasa=$4, creado_en=now()`,
    [mes, Math.round(r.totalCop), Math.round(r.totalUsd), r.tasa],
  );
}
