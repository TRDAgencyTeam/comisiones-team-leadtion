import "server-only";
import { consulta } from "@/lib/db";
import { tasaUsdCop } from "@/lib/fx";
import { calcLLC, calcCOL } from "@/lib/facturacion-calc";
import type { ServicioCatalogo } from "@/lib/catalogo-tipos";

export interface FacturaRow {
  id: number;
  mes: string;
  entidad: "LLC" | "COL";
  clienteId: number | null;
  clienteNombre: string;
  mrr: number | null;
  reserva: boolean;
  recurrente: boolean;
  servicios: string | null;
  precioDesglose: string | null;
  facturado: number;
  medio: string | null;
  fechaFactura: string | null;
  fechaPago: string | null;
  ivaPct: number;
  estado: string;
  mesContrato: number | null;
  servicioClave: string | null;
  tasa: number | null;
}

/** Catálogo de servicios (para el modal Nuevo cliente y la vista). */
export async function catalogoServicios(): Promise<ServicioCatalogo[]> {
  const rows = await consulta(
    `select clave, nombre, categoria, recurrente, precio_variable, precio_mes1, precio_resto,
            min_meses, aplica_cs, aplica_referido, aplica_reserva, por_persona, precio_persona
       from public.servicio_catalogo where activo = true order by orden, nombre`,
  );
  return rows.map((r: Record<string, unknown>) => ({
    clave: String(r.clave),
    nombre: String(r.nombre),
    categoria: r.categoria as ServicioCatalogo["categoria"],
    recurrente: Boolean(r.recurrente),
    precioVariable: Boolean(r.precio_variable),
    precioMes1: r.precio_mes1 != null ? Number(r.precio_mes1) : null,
    precioResto: r.precio_resto != null ? Number(r.precio_resto) : null,
    minMeses: Number(r.min_meses),
    aplicaCs: Boolean(r.aplica_cs),
    aplicaReferido: Boolean(r.aplica_referido),
    aplicaReserva: Boolean(r.aplica_reserva),
    porPersona: Boolean(r.por_persona),
    precioPersona: r.precio_persona != null ? Number(r.precio_persona) : null,
  }));
}

const num = (v: unknown): number => (v == null ? 0 : Number(v));
const toISO = (v: unknown): string | null =>
  v == null ? null : v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10);

export function primerDiaMes(mes: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(mes);
  const h = new Date();
  return m ? `${m[1]}-${m[2]}-01` : `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}-01`;
}
export function mesAnteriorISO(mes: string): string {
  const [a, m] = primerDiaMes(mes).split("-").map(Number);
  const d = new Date(a!, (m! - 1) - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
export function mesActualISO(): string {
  const h = new Date();
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}`;
}

function mapRow(r: Record<string, unknown>): FacturaRow {
  return {
    id: Number(r.id),
    mes: toISO(r.mes)!.slice(0, 7),
    entidad: (r.entidad as "LLC" | "COL") ?? "LLC",
    clienteId: r.cliente_id != null ? Number(r.cliente_id) : null,
    clienteNombre: String(r.cliente_nombre),
    mrr: r.mrr != null ? Number(r.mrr) : null,
    reserva: Boolean(r.reserva),
    recurrente: Boolean(r.recurrente),
    servicios: (r.servicios as string) ?? null,
    precioDesglose: (r.precio_desglose as string) ?? null,
    facturado: num(r.facturado),
    medio: (r.medio as string) ?? null,
    fechaFactura: toISO(r.fecha_factura),
    fechaPago: toISO(r.fecha_pago),
    ivaPct: num(r.iva_pct),
    estado: String(r.estado),
    mesContrato: r.mes_contrato != null ? Number(r.mes_contrato) : null,
    servicioClave: (r.servicio_clave as string) ?? null,
    tasa: r.tasa != null ? Number(r.tasa) : null,
  };
}

/** Neto de una factura en USD (LLC: facturado−pasarela; COL: antes de IVA ÷ tasa). */
export function netoUsdDeFactura(f: FacturaRow, tasa: number): number {
  const t = f.tasa ?? tasa; // tasa histórica del mes si existe
  return f.entidad === "LLC" ? calcLLC(f.facturado, f.medio).neto : calcCOL(f.facturado, f.ivaPct, t).netoUsd;
}

/**
 * AUTO-GENERACIÓN de recurrentes: si el mes no tiene facturas aún, clona las
 * recurrentes del mes anterior (cliente no cancelado) como "por facturar".
 * Idempotente y seguro (solo actúa si el mes está vacío). Lo usa la vista (lazy)
 * y el cron del día 1.
 */
export async function asegurarRecurrentesDelMes(mes: string): Promise<number> {
  const primer = primerDiaMes(mes);
  const anterior = primerDiaMes(mesAnteriorISO(mes));
  const yaHay = await consulta(`select 1 from public.factura_mensual where mes = $1 limit 1`, [primer]);
  if (yaHay.length > 0) return 0;
  // Clona los recurrentes del mes anterior. mes_contrato +1; si supera el mínimo
  // del contrato (catálogo) justo en el mes siguiente → estado 'por_confirmar'
  // (aviso "¿Continúa?"). El precio del "resto" del catálogo se respeta si existe.
  const res = await consulta(
    `insert into public.factura_mensual
       (mes, entidad, cliente_id, cliente_nombre, mrr, reserva, recurrente, servicios, precio_desglose,
        facturado, medio, iva_pct, estado, mes_contrato, servicio_clave)
     select $1, f.entidad, f.cliente_id, f.cliente_nombre, f.mrr, f.reserva, true, f.servicios, f.precio_desglose,
        f.facturado, f.medio, f.iva_pct,
        case when coalesce(f.mes_contrato,1) + 1 = coalesce(sc.min_meses, 4) + 1
             then 'por_confirmar' else 'por_facturar' end,
        coalesce(f.mes_contrato,1) + 1, f.servicio_clave
       from public.factura_mensual f
       left join public.clientes c on c.id = f.cliente_id
       left join public.servicio_catalogo sc on sc.clave = f.servicio_clave
      where f.mes = $2 and f.recurrente = true and f.estado <> 'anulado'
        and (c.id is null or c.estado_actual = 'activo')`,
    [primer, anterior],
  );
  return res.length ?? 0;
}

export interface ServicioLeadtion { clienteNombre: string; concepto: string; esReactivacion: boolean; valorUsd: number; }
export interface MembresiasResumen { cuentas: number; totalUsd: number; }

const SRV_LABEL: Record<string, string> = { reactivacion: "Reactivación", agente_ai: "Agente IA", level_up: "Level Up" };

/** Servicios/soporte de Leadtion cobrados este mes (se jalan; no se re-escriben). */
export async function serviciosLeadtionDelMes(mes: string): Promise<ServicioLeadtion[]> {
  const primer = primerDiaMes(mes);
  const rows = await consulta(
    `select c.nombre, p.origen, p.valor,
            (select string_agg(distinct cs.tipo_servicio, ',') from public.cliente_servicios cs where cs.cliente_id = p.cliente_id) tipos
       from public.pagos_mensuales p
       join public.clientes c on c.id = p.cliente_id
      where p.mes = $1 and p.origen in ('servicio','soporte') and coalesce(p.valor,0) > 0
      order by c.nombre`,
    [primer],
  );
  return rows.map((r: Record<string, unknown>) => {
    const tipos = String(r.tipos ?? "");
    const esReactivacion = tipos.includes("reactivacion");
    const concepto = r.origen === "soporte"
      ? "Soporte"
      : tipos.split(",").filter(Boolean).map((t) => SRV_LABEL[t] ?? t).join(" + ") || "Servicio Leadtion";
    return { clienteNombre: String(r.nombre), concepto, esReactivacion, valorUsd: num(r.valor) };
  });
}

/** Resumen de cuentas Leadtion (membresías) del mes: # con cobro y total USD. */
export async function membresiasLeadtionDelMes(mes: string): Promise<MembresiasResumen> {
  const primer = primerDiaMes(mes);
  const r = await consulta(
    `select count(*)::int cuentas, coalesce(sum(valor),0)::float total
       from public.pagos_mensuales
      where mes = $1 and origen is null and coalesce(valor,0) > 0`,
    [primer],
  );
  return { cuentas: Number(r[0]!.cuentas), totalUsd: Number(r[0]!.total) };
}

export interface VistaFacturacion {
  tasa: number;
  recurrentes: FacturaRow[];
  delMomento: FacturaRow[];
  leadtion: ServicioLeadtion[];
  membresias: MembresiasResumen;
  totales: {
    agenciaNetoUsd: number; pasarelaUsd: number; leadtionServiciosUsd: number;
    ingresosUsd: number; pendientes: number;
  };
}

export async function vistaFacturacion(mes: string): Promise<VistaFacturacion> {
  await asegurarRecurrentesDelMes(mes); // lazy: deja el mes listo
  const primer = primerDiaMes(mes);
  const [rows, fx, leadtion, membresias] = await Promise.all([
    consulta(`select * from public.factura_mensual where mes = $1
              order by recurrente desc, (mrr is null), mrr, cliente_nombre`, [primer]),
    tasaUsdCop(),
    serviciosLeadtionDelMes(mes),
    membresiasLeadtionDelMes(mes),
  ]);
  const filas = rows.map(mapRow);
  const tasa = fx.cop;
  const recurrentes = filas.filter((f) => f.recurrente);
  const delMomento = filas.filter((f) => !f.recurrente);

  let agenciaNetoUsd = 0, pasarelaUsd = 0, pendientes = 0;
  for (const f of filas) {
    if (f.estado === "anulado") continue;
    if (f.entidad === "LLC") { const c = calcLLC(f.facturado, f.medio); agenciaNetoUsd += c.neto; pasarelaUsd += c.pasarela; }
    else agenciaNetoUsd += calcCOL(f.facturado, f.ivaPct, f.tasa ?? tasa).netoUsd;
    if (f.estado !== "pagado") pendientes += 1;
  }
  const leadtionServiciosUsd = leadtion.reduce((s, x) => s + x.valorUsd, 0);
  const r2 = (n: number) => Math.round(n * 100) / 100;
  return {
    tasa, recurrentes, delMomento, leadtion, membresias,
    totales: {
      agenciaNetoUsd: r2(agenciaNetoUsd), pasarelaUsd: r2(pasarelaUsd), leadtionServiciosUsd: r2(leadtionServiciosUsd),
      ingresosUsd: r2(agenciaNetoUsd + leadtionServiciosUsd + membresias.totalUsd), pendientes,
    },
  };
}

export async function obtenerFactura(id: number): Promise<FacturaRow | null> {
  const rows = await consulta(`select * from public.factura_mensual where id = $1`, [id]);
  return rows.length ? mapRow(rows[0]!) : null;
}

/** Historial de todas las facturas de un cliente (por nombre), viejo→nuevo. */
export async function historialCliente(nombre: string): Promise<FacturaRow[]> {
  const rows = await consulta(
    `select * from public.factura_mensual where lower(trim(cliente_nombre)) = lower(trim($1)) order by mes`,
    [nombre],
  );
  return rows.map(mapRow);
}

/** Clientes existentes (para enlazar la factura con un cliente Leadtion/Membresías). */
export async function clientesParaFactura(): Promise<{ id: number; nombre: string }[]> {
  const rows = await consulta(`select id, nombre from public.clientes order by nombre`);
  return rows.map((r) => ({ id: Number(r.id), nombre: String(r.nombre) }));
}
