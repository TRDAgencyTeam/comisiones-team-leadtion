import "server-only";
import { consulta } from "@/lib/db";
import { cargarResultados } from "@/lib/comisiones";

/** Datos y consultas de la sección Clientes (lista, ficha, historial). */

export type EstadoCliente = "activo" | "cancelado" | "pausado";

export interface ClienteResumen {
  id: number;
  nombre: string;
  plan: string | null;
  fechaActivacion: string | null;
  estado: EstadoCliente;
  fechaCancelacion: string | null;
  /** Comisión total que este cliente representa para el equipo, al corte. */
  comisionEquipo: number;
}

export interface ClientesPorMes {
  mes: string; // 'YYYY-MM'
  total: number;
  activos: number;
}

export interface PagoMes {
  mes: string;
  estadoMes: string;
  valor: number | null;
}

export interface AporteColaborador {
  colaborador: string;
  hito: string;
  monto: number;
  estado: "pendiente" | "pagado";
}

export interface CambioEstado {
  estado: string;
  motivo: string | null;
  cambiadoEn: string;
}

export interface FichaCliente {
  id: number;
  nombre: string;
  plan: string | null;
  planTipo: "agente_ai" | "reactivacion" | null;
  soporteValor: number | null;
  fechaActivacion: string | null;
  estado: EstadoCliente;
  motivoEstado: string | null;
  fechaCancelacion: string | null;
  valorLicencia: number | null;
  incluyeCrmMarketing: boolean;
  serviciosAdicionales: string | null;
  notas: string | null;
  pagos: PagoMes[];
  comisionEquipo: number;
  aportes: AporteColaborador[];
  historialEstado: CambioEstado[];
  /** Lifetime value: suma de todos los cobros mensuales registrados. */
  ltv: number;
  /** Meses con cobro (valor > 0). */
  mesesConCobro: number;
  /** Promedio por mes cobrado. */
  promedioMensual: number;
}

/** Normaliza fechas de Postgres (Date | string) a 'YYYY-MM-DD'. */
function toISO(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

/**
 * Construye, para un corte, el mapa clienteId -> comisión total del equipo y el
 * desglose por colaborador (nombre, hito, monto, estado de pago).
 */
async function comisionPorCliente(corte: string) {
  const resultados = await cargarResultados(corte);
  const total = new Map<number, number>();
  const detalle = new Map<number, AporteColaborador[]>();
  for (const r of resultados) {
    for (const l of r.lineas) {
      total.set(l.clienteId, (total.get(l.clienteId) ?? 0) + l.subtotal);
      const arr = detalle.get(l.clienteId) ?? [];
      for (const h of l.hitos) {
        arr.push({ colaborador: r.colaboradorNombre, hito: h.hito, monto: h.monto, estado: h.estado });
      }
      detalle.set(l.clienteId, arr);
    }
  }
  return { total, detalle };
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export interface ClienteAntiguo {
  id: number;
  nombre: string;
  fechaActivacion: string;
  mesesActivo: number;
}

export interface EstadisticasClientes {
  total: number;
  activos: number;
  cancelados: number;
  pausados: number;
  conMarketing: number;
  masAntiguos: ClienteAntiguo[];
}

/** Meses transcurridos entre una fecha ISO y hoy (aprox., por mes calendario). */
function mesesDesde(iso: string): number {
  const [ay, am] = iso.split("-").map(Number);
  const hoy = new Date();
  return (hoy.getUTCFullYear() * 12 + hoy.getUTCMonth()) - ((ay ?? 0) * 12 + ((am ?? 1) - 1));
}

/** Conteos globales de clientes + los activos más antiguos (para el Dashboard). */
export async function estadisticasClientes(): Promise<EstadisticasClientes> {
  const [conteo, antiguos] = await Promise.all([
    consulta(
      `select
         count(*)::int total,
         count(*) filter (where estado_actual='activo')::int activos,
         count(*) filter (where estado_actual='cancelado')::int cancelados,
         count(*) filter (where estado_actual='pausado')::int pausados,
         count(*) filter (where incluye_crm_en_marketing)::int marketing
       from public.clientes`,
    ),
    consulta(
      `select id, nombre, fecha_activacion from public.clientes
        where estado_actual='activo' and fecha_activacion is not null
        order by fecha_activacion asc limit 6`,
    ),
  ]);
  const c = conteo[0]!;
  return {
    total: Number(c.total),
    activos: Number(c.activos),
    cancelados: Number(c.cancelados),
    pausados: Number(c.pausados),
    conMarketing: Number(c.marketing),
    masAntiguos: antiguos.map((r) => {
      const f = toISO(r.fecha_activacion)!;
      return { id: Number(r.id), nombre: String(r.nombre), fechaActivacion: f, mesesActivo: mesesDesde(f) };
    }),
  };
}

/** Lista clientes (con búsqueda y orden) y la comisión que representan al equipo. */
export async function listarClientes(
  corte: string,
  opts: { q?: string; orden?: "antiguo" | "nuevo" } = {},
): Promise<ClienteResumen[]> {
  const q = (opts.q ?? "").trim();
  const dir = opts.orden === "antiguo" ? "asc" : "desc";
  const params: unknown[] = [];
  let where = "";
  if (q) {
    params.push(`%${q}%`);
    where = `where nombre ilike $1`;
  }
  const [rows, comision] = await Promise.all([
    consulta(
      `select id, nombre, plan, fecha_activacion, estado_actual, fecha_cancelacion
         from public.clientes ${where}
        order by fecha_activacion ${dir} nulls last, nombre`,
      params,
    ),
    comisionPorCliente(corte),
  ]);
  return rows.map((r) => ({
    id: Number(r.id),
    nombre: String(r.nombre),
    plan: (r.plan as string | null) ?? null,
    fechaActivacion: toISO(r.fecha_activacion),
    estado: r.estado_actual as EstadoCliente,
    fechaCancelacion: toISO(r.fecha_cancelacion),
    comisionEquipo: round2(comision.total.get(Number(r.id)) ?? 0),
  }));
}

export interface IngresoMes {
  mes: string; // 'YYYY-MM'
  ingreso: number;
}

/** Ingresos reales por mes (suma de cobros en pagos_mensuales). */
export async function ingresosPorMes(limite = 12): Promise<IngresoMes[]> {
  const rows = await consulta(
    `select to_char(mes,'YYYY-MM') mes, coalesce(sum(valor),0)::float ingreso
       from public.pagos_mensuales
      where valor is not null and valor > 0
      group by 1 order by 1 desc limit $1`,
    [limite],
  );
  return rows
    .map((r) => ({ mes: String(r.mes), ingreso: round2(Number(r.ingreso)) }))
    .reverse(); // cronológico ascendente para el gráfico
}

/** Clientes agrupados por mes de activación (cohorte mensual). */
export async function clientesPorMes(): Promise<ClientesPorMes[]> {
  const rows = await consulta(
    `select to_char(fecha_activacion,'YYYY-MM') mes,
            count(*)::int total,
            count(*) filter (where estado_actual='activo')::int activos
       from public.clientes
      where fecha_activacion is not null
      group by 1 order by 1 desc`,
  );
  return rows.map((r) => ({
    mes: String(r.mes),
    total: Number(r.total),
    activos: Number(r.activos),
  }));
}

/** Ficha completa de un cliente: datos, historial mensual y comisión al equipo. */
export async function obtenerCliente(
  id: number,
  corte: string,
): Promise<FichaCliente | null> {
  const rows = await consulta(
    `select id, nombre, plan, plan_tipo, soporte_valor, fecha_activacion, estado_actual,
            motivo_estado, fecha_cancelacion, valor_licencia_general,
            incluye_crm_en_marketing, servicios_adicionales, notas
       from public.clientes where id = $1`,
    [id],
  );
  if (rows.length === 0) return null;
  const r = rows[0]!;

  const [pagosRows, histRows, comision] = await Promise.all([
    consulta(
      `select mes, estado_mes, valor from public.pagos_mensuales
        where cliente_id = $1 order by mes`,
      [id],
    ),
    consulta(
      `select estado, motivo, cambiado_en from public.cliente_estado_historial
        where cliente_id = $1 order by cambiado_en desc`,
      [id],
    ),
    comisionPorCliente(corte),
  ]);

  const pagos: PagoMes[] = pagosRows.map((p) => ({
    mes: toISO(p.mes)!,
    estadoMes: String(p.estado_mes),
    valor: p.valor === null ? null : Number(p.valor),
  }));
  const conCobro = pagos.filter((p) => (p.valor ?? 0) > 0);
  const ltv = round2(conCobro.reduce((s, p) => s + (p.valor ?? 0), 0));
  const mesesConCobro = conCobro.length;

  return {
    id: Number(r.id),
    nombre: String(r.nombre),
    plan: (r.plan as string | null) ?? null,
    planTipo: (r.plan_tipo as "agente_ai" | "reactivacion" | null) ?? null,
    soporteValor: r.soporte_valor === null ? null : Number(r.soporte_valor),
    ltv,
    mesesConCobro,
    promedioMensual: mesesConCobro ? round2(ltv / mesesConCobro) : 0,
    fechaActivacion: toISO(r.fecha_activacion),
    estado: r.estado_actual as EstadoCliente,
    motivoEstado: (r.motivo_estado as string | null) ?? null,
    fechaCancelacion: toISO(r.fecha_cancelacion),
    valorLicencia: r.valor_licencia_general === null ? null : Number(r.valor_licencia_general),
    incluyeCrmMarketing: Boolean(r.incluye_crm_en_marketing),
    serviciosAdicionales: (r.servicios_adicionales as string | null) ?? null,
    notas: (r.notas as string | null) ?? null,
    pagos,
    comisionEquipo: round2(comision.total.get(id) ?? 0),
    aportes: comision.detalle.get(id) ?? [],
    historialEstado: histRows.map((h) => ({
      estado: String(h.estado),
      motivo: (h.motivo as string | null) ?? null,
      cambiadoEn: h.cambiado_en instanceof Date ? h.cambiado_en.toISOString() : String(h.cambiado_en),
    })),
  };
}
