import "server-only";
import { consulta } from "@/lib/db";

/** Módulo Clientes / Membresías: maestro de clientes de Leadtion. */

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export const PLAN_LABEL: Record<string, string> = {
  agente_ai: "Agente AI", reactivacion: "Reactivación", level_up: "Level Up",
};
export const TIPO_LABEL: Record<string, string> = {
  estandar: "Estándar", agencia: "Agencia", servicio: "Servicio Leadtion",
};

export type EstadoMembresia = "activo" | "cancelado" | "pausado";

export interface MembresiaRow {
  id: number;
  nombre: string;
  planTipo: string | null;
  plan: string | null;
  soporteValor: number | null;
  esAgencia: boolean;
  tipoCliente: string | null;
  estado: EstadoMembresia;
  fechaActivacion: string | null;
  tiempoMeses: number;
  ltv: number;
  apiEstado: string | null;
}

export interface StatsMembresias {
  total: number;
  activas: number;
  pausadas: number;
  canceladas: number;
  agencia: number;
  servicio: number;
  estandar: number;
}

function toISO(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : s;
}
function mesesDesde(iso: string | null, hoy = new Date()): number {
  if (!iso) return 0;
  const [ay, am] = iso.split("-").map(Number);
  return Math.max(0, (hoy.getUTCFullYear() * 12 + hoy.getUTCMonth()) - ((ay ?? 0) * 12 + ((am ?? 1) - 1)));
}

/** LTV por cliente: suma de cobros mensuales registrados. */
async function ltvPorCliente(): Promise<Map<number, number>> {
  const rows = await consulta(
    `select cliente_id, coalesce(sum(valor),0)::float ltv
       from public.pagos_mensuales where valor is not null and valor > 0
      group by cliente_id`,
  );
  const m = new Map<number, number>();
  for (const r of rows) m.set(Number(r.cliente_id), round2(Number(r.ltv)));
  return m;
}

export async function listarMembresias(
  opts: { q?: string; estado?: string; orden?: string; tipo?: string } = {},
): Promise<MembresiaRow[]> {
  const [rows, ltv] = await Promise.all([
    consulta(
      `select id, nombre, plan, plan_tipo, soporte_valor, incluye_crm_en_marketing, es_agencia,
              tipo_cliente, estado_actual, fecha_activacion, api_estado
         from public.clientes`,
    ),
    ltvPorCliente(),
  ]);

  let lista: MembresiaRow[] = rows.map((r) => {
    const f = toISO(r.fecha_activacion);
    return {
      id: Number(r.id), nombre: String(r.nombre),
      planTipo: (r.plan_tipo as string) ?? null, plan: (r.plan as string) ?? null,
      soporteValor: r.soporte_valor == null ? null : Number(r.soporte_valor),
      esAgencia: Boolean(r.es_agencia),
      tipoCliente: (r.tipo_cliente as string) ?? null,
      estado: r.estado_actual as EstadoMembresia,
      fechaActivacion: f, tiempoMeses: mesesDesde(f),
      ltv: ltv.get(Number(r.id)) ?? 0,
      apiEstado: (r.api_estado as string) ?? null,
    };
  });

  const q = (opts.q ?? "").trim().toLowerCase();
  if (q) lista = lista.filter((c) => c.nombre.toLowerCase().includes(q));
  if (opts.estado && opts.estado !== "todos") lista = lista.filter((c) => c.estado === opts.estado);
  // "Agencia" = flag es_agencia (independiente del tipo); servicio/estándar solo si NO es agencia.
  if (opts.tipo === "agencia") lista = lista.filter((c) => c.esAgencia);
  else if (opts.tipo === "servicio") lista = lista.filter((c) => !c.esAgencia && c.tipoCliente === "servicio");
  else if (opts.tipo === "estandar") lista = lista.filter((c) => !c.esAgencia && (c.tipoCliente ?? "estandar") !== "servicio");

  if (opts.orden === "ltv") lista.sort((a, b) => b.ltv - a.ltv);
  else if (opts.orden === "antiguo") lista.sort((a, b) => (a.fechaActivacion ?? "").localeCompare(b.fechaActivacion ?? ""));
  else lista.sort((a, b) => (b.fechaActivacion ?? "").localeCompare(a.fechaActivacion ?? "")); // nuevo

  return lista;
}

export interface PagoMes { mes: string; estadoMes: string; valor: number | null; }
export interface FichaMembresia {
  id: number; nombre: string; planTipo: string | null; soporteValor: number | null;
  esAgencia: boolean; agenciaDesde: string | null; servicioActivo: boolean;
  tipoCliente: string | null; estado: EstadoMembresia; fechaActivacion: string | null;
  fechaInicioReal: string | null; tiempoMeses: number; ltv: number;
  valorLicencia: number | null; apiEstado: string | null; apiValor: number | null;
  bono: number | null; reserva: boolean; pagos: PagoMes[];
  asignados: { id: number; nombre: string }[]; afiliadoNombre: string | null;
}

/** Opciones para el formulario: colaboradores CS que comisionan + afiliados. */
export async function opcionesFormulario(): Promise<{
  colaboradores: { id: number; nombre: string }[];
  afiliados: { ref: string; nombre: string; tipo: string }[];
}> {
  const [colabs, afs] = await Promise.all([
    consulta(`select id, nombre from public.colaboradores where categoria in ('fundador','nuevo') order by nombre`),
    consulta(`select ref, nombre, tipo from public.afiliados order by nombre`),
  ]);
  return {
    colaboradores: colabs.map((r) => ({ id: Number(r.id), nombre: String(r.nombre) })),
    afiliados: afs.map((r) => ({ ref: String(r.ref), nombre: String(r.nombre), tipo: String(r.tipo) })),
  };
}

export async function obtenerMembresia(id: number): Promise<FichaMembresia | null> {
  const rows = await consulta(
    `select id, nombre, plan_tipo, soporte_valor, incluye_crm_en_marketing, es_agencia, agencia_desde,
            tipo_cliente, estado_actual, fecha_activacion, fecha_inicio_real, valor_licencia_general,
            api_estado, api_valor, bono_reactivacion, reserva
       from public.clientes where id = $1`,
    [id],
  );
  if (rows.length === 0) return null;
  const r = rows[0]!;
  const mesActual = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`;
  const [pagos, asignRows, afRows, servActivo] = await Promise.all([
    consulta(`select mes, estado_mes, valor from public.pagos_mensuales where cliente_id=$1 order by mes`, [id]),
    consulta(`select c.id, c.nombre from public.cliente_colaboradores cc join public.colaboradores c on c.id=cc.colaborador_id where cc.cliente_id=$1`, [id]),
    consulta(`select a.nombre from public.clientes_afiliados ca join public.afiliados a on a.ref=ca.afiliado_ref where ca.ref = $1`, [`cl-mem-${id}`]),
    consulta(`select 1 from public.pagos_mensuales where cliente_id=$1 and origen='servicio' and mes=$2 and coalesce(valor,0) > 0 limit 1`, [id, mesActual]),
  ]);
  const f = toISO(r.fecha_activacion);
  const lista = pagos.map((p) => ({ mes: toISO(p.mes)!, estadoMes: String(p.estado_mes), valor: p.valor == null ? null : Number(p.valor) }));
  const ltv = round2(lista.filter((p) => (p.valor ?? 0) > 0).reduce((s, p) => s + (p.valor ?? 0), 0));
  return {
    id: Number(r.id), nombre: String(r.nombre), planTipo: (r.plan_tipo as string) ?? null,
    soporteValor: r.soporte_valor == null ? null : Number(r.soporte_valor),
    esAgencia: Boolean(r.es_agencia), agenciaDesde: toISO(r.agencia_desde), servicioActivo: servActivo.length > 0,
    tipoCliente: (r.tipo_cliente as string) ?? null,
    estado: r.estado_actual as EstadoMembresia,
    fechaActivacion: f, fechaInicioReal: toISO(r.fecha_inicio_real), tiempoMeses: mesesDesde(f),
    ltv, valorLicencia: r.valor_licencia_general == null ? null : Number(r.valor_licencia_general),
    apiEstado: (r.api_estado as string) ?? null, apiValor: r.api_valor == null ? null : Number(r.api_valor),
    bono: r.bono_reactivacion == null ? null : Number(r.bono_reactivacion), reserva: Boolean(r.reserva),
    pagos: lista,
    asignados: asignRows.map((a) => ({ id: Number(a.id), nombre: String(a.nombre) })),
    afiliadoNombre: afRows.length ? String(afRows[0]!.nombre) : null,
  };
}

export async function statsMembresias(): Promise<StatsMembresias> {
  const r = await consulta(
    `select count(*)::int total,
            count(*) filter (where estado_actual='activo')::int activas,
            count(*) filter (where estado_actual='pausado')::int pausadas,
            count(*) filter (where estado_actual='cancelado')::int canceladas,
            count(*) filter (where es_agencia and estado_actual='activo')::int agencia,
            count(*) filter (where not es_agencia and tipo_cliente='servicio' and estado_actual='activo')::int servicio,
            count(*) filter (where not es_agencia and coalesce(tipo_cliente,'estandar')<>'servicio' and estado_actual='activo')::int estandar
       from public.clientes`,
  );
  const c = r[0]!;
  return {
    total: Number(c.total), activas: Number(c.activas), pausadas: Number(c.pausadas),
    canceladas: Number(c.canceladas), agencia: Number(c.agencia),
    servicio: Number(c.servicio), estandar: Number(c.estandar),
  };
}
