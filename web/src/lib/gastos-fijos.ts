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
