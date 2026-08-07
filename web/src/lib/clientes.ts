import "server-only";
import { consulta } from "@/lib/db";
import { cargarResultados } from "@/lib/comisiones";

/** Datos y consultas de la sección Clientes (lista, ficha, historial). */

export interface ClienteResumen {
  id: number;
  nombre: string;
  plan: string | null;
  fechaActivacion: string | null;
  estado: "activo" | "cancelado";
  fechaCancelacion: string | null;
  /** Comisión total que este cliente representa para el equipo, al corte. */
  comisionEquipo: number;
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

export interface FichaCliente {
  id: number;
  nombre: string;
  plan: string | null;
  fechaActivacion: string | null;
  estado: "activo" | "cancelado";
  fechaCancelacion: string | null;
  valorLicencia: number | null;
  incluyeCrmMarketing: boolean;
  serviciosAdicionales: string | null;
  notas: string | null;
  pagos: PagoMes[];
  comisionEquipo: number;
  aportes: AporteColaborador[];
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

/** Lista todos los clientes con la comisión que representan para el equipo. */
export async function listarClientes(corte: string): Promise<ClienteResumen[]> {
  const [rows, comision] = await Promise.all([
    consulta(
      `select id, nombre, plan, fecha_activacion, estado_actual, fecha_cancelacion
         from public.clientes order by fecha_activacion desc nulls last, nombre`,
    ),
    comisionPorCliente(corte),
  ]);
  return rows.map((r) => ({
    id: Number(r.id),
    nombre: String(r.nombre),
    plan: (r.plan as string | null) ?? null,
    fechaActivacion: toISO(r.fecha_activacion),
    estado: r.estado_actual as "activo" | "cancelado",
    fechaCancelacion: toISO(r.fecha_cancelacion),
    comisionEquipo: round2(comision.total.get(Number(r.id)) ?? 0),
  }));
}

/** Ficha completa de un cliente: datos, historial mensual y comisión al equipo. */
export async function obtenerCliente(
  id: number,
  corte: string,
): Promise<FichaCliente | null> {
  const rows = await consulta(
    `select id, nombre, plan, fecha_activacion, estado_actual, fecha_cancelacion,
            valor_licencia_general, incluye_crm_en_marketing, servicios_adicionales, notas
       from public.clientes where id = $1`,
    [id],
  );
  if (rows.length === 0) return null;
  const r = rows[0]!;

  const [pagosRows, comision] = await Promise.all([
    consulta(
      `select mes, estado_mes, valor from public.pagos_mensuales
        where cliente_id = $1 order by mes`,
      [id],
    ),
    comisionPorCliente(corte),
  ]);

  return {
    id: Number(r.id),
    nombre: String(r.nombre),
    plan: (r.plan as string | null) ?? null,
    fechaActivacion: toISO(r.fecha_activacion),
    estado: r.estado_actual as "activo" | "cancelado",
    fechaCancelacion: toISO(r.fecha_cancelacion),
    valorLicencia: r.valor_licencia_general === null ? null : Number(r.valor_licencia_general),
    incluyeCrmMarketing: Boolean(r.incluye_crm_en_marketing),
    serviciosAdicionales: (r.servicios_adicionales as string | null) ?? null,
    notas: (r.notas as string | null) ?? null,
    pagos: pagosRows.map((p) => ({
      mes: toISO(p.mes)!,
      estadoMes: String(p.estado_mes),
      valor: p.valor === null ? null : Number(p.valor),
    })),
    comisionEquipo: round2(comision.total.get(id) ?? 0),
    aportes: comision.detalle.get(id) ?? [],
  };
}
