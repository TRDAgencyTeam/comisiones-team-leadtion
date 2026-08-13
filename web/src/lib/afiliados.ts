import "server-only";
import { consulta } from "@/lib/db";
import {
  getAllComisiones,
  getActiveCount,
  levelInfo,
  type Afiliado,
  type ClienteAfiliado,
  type ServicioAfiliado,
  type PagoAfiliado,
  type FilaComision,
} from "@/lib/afiliados-engine";

/** Capa de datos del módulo Afiliados: carga de Supabase + glue con el motor. */

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const SRV_LABELS: Record<string, string> = {
  reactivacion: "Reactivación", agente_ai: "Agente AI",
  text_ai: "Text AI", voz_ai: "Voz AI", otro: "Personalizado",
};

export interface Base {
  afiliados: (Afiliado & { email: string | null; ingreso: string | null; notas: string | null })[];
  clientes: (ClienteAfiliado & { email: string | null })[];
  servicios: ServicioAfiliado[];
  pagos: PagoAfiliado[];
}

/** Carga las 4 tablas *_afiliados desde Supabase. */
export async function cargarBase(): Promise<Base> {
  const [af, cl, sv, pg] = await Promise.all([
    consulta(`select ref,nombre,email,tipo,ingreso,notas,comision_agencia from public.afiliados order by nombre`),
    consulta(`select ref,nombre,email,afiliado_ref,fecha_inicio,precio_licencia from public.clientes_afiliados`),
    consulta(`select ref,cliente_ref,tipo,precio from public.servicios_afiliados`),
    consulta(`select cliente_ref,mes_num from public.pagos_afiliados`),
  ]);
  return {
    afiliados: af.map((r) => ({
      ref: String(r.ref), nombre: String(r.nombre), email: (r.email as string) ?? null,
      tipo: r.tipo as "agencia" | "partner", ingreso: r.ingreso ? String(r.ingreso).slice(0, 10) : null,
      notas: (r.notas as string) ?? null,
      comisionAgencia: r.comision_agencia === null ? null : Number(r.comision_agencia),
    })),
    clientes: cl.map((r) => ({
      ref: String(r.ref), nombre: String(r.nombre), email: (r.email as string) ?? null,
      afiliadoRef: (r.afiliado_ref as string) ?? null, fechaInicio: (r.fecha_inicio as string) ?? null,
      precioLicencia: r.precio_licencia === null ? null : Number(r.precio_licencia),
    })),
    servicios: sv.map((r) => ({
      ref: String(r.ref), clienteRef: (r.cliente_ref as string) ?? null,
      tipo: String(r.tipo), precio: r.precio === null ? null : Number(r.precio),
    })),
    pagos: pg.map((r) => ({ clienteRef: (r.cliente_ref as string) ?? null, mesNum: Number(r.mes_num) })),
  };
}

export function mesActual(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export interface DashboardAfiliados {
  afiliadosActivos: number;
  clientesTotales: number;
  pendienteMes: number;
  pagadoMes: number;
  mes: string;
  pendientes: FilaComision[]; // del mes actual
}

export async function dashboardAfiliados(now = new Date()): Promise<{ base: Base; dash: DashboardAfiliados; filas: FilaComision[] }> {
  const base = await cargarBase();
  const filas = getAllComisiones(base.afiliados, base.clientes, base.servicios, base.pagos, now);
  const mes = mesActual(now);
  const delMes = filas.filter((f) => f.mes === mes);
  const afiliadosActivos = base.afiliados.filter((a) => getActiveCount(a.ref, base.clientes, now) > 0).length;
  return {
    base,
    filas,
    dash: {
      afiliadosActivos,
      clientesTotales: base.clientes.length,
      pendienteMes: round2(delMes.filter((f) => !f.pagado).reduce((s, f) => s + f.monto, 0)),
      pagadoMes: round2(delMes.filter((f) => f.pagado).reduce((s, f) => s + f.monto, 0)),
      mes,
      pendientes: delMes.filter((f) => !f.pagado),
    },
  };
}

/** Nivel y % actual de un afiliado. */
export function nivelAfiliado(afRef: string, clientes: ClienteAfiliado[], now = new Date()) {
  const n = getActiveCount(afRef, clientes, now);
  return { activos: n, ...levelInfo(n) };
}
