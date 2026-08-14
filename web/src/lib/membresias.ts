import "server-only";
import { consulta } from "@/lib/db";

/** Módulo Clientes / Membresías: maestro de clientes de Leadtion. */

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export const PLAN_LABEL: Record<string, string> = {
  agente_ai: "Agente AI", reactivacion: "Reactivación", level_up: "Level Up",
};

export type EstadoMembresia = "activo" | "cancelado" | "pausado";

export interface MembresiaRow {
  id: number;
  nombre: string;
  planTipo: string | null;
  plan: string | null;
  soporteValor: number | null;
  esAgencia: boolean;
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
  opts: { q?: string; estado?: string; orden?: string } = {},
): Promise<MembresiaRow[]> {
  const [rows, ltv] = await Promise.all([
    consulta(
      `select id, nombre, plan, plan_tipo, soporte_valor, incluye_crm_en_marketing,
              estado_actual, fecha_activacion, api_estado
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
      esAgencia: Boolean(r.incluye_crm_en_marketing),
      estado: r.estado_actual as EstadoMembresia,
      fechaActivacion: f, tiempoMeses: mesesDesde(f),
      ltv: ltv.get(Number(r.id)) ?? 0,
      apiEstado: (r.api_estado as string) ?? null,
    };
  });

  const q = (opts.q ?? "").trim().toLowerCase();
  if (q) lista = lista.filter((c) => c.nombre.toLowerCase().includes(q));
  if (opts.estado && opts.estado !== "todos") lista = lista.filter((c) => c.estado === opts.estado);

  if (opts.orden === "ltv") lista.sort((a, b) => b.ltv - a.ltv);
  else if (opts.orden === "antiguo") lista.sort((a, b) => (a.fechaActivacion ?? "").localeCompare(b.fechaActivacion ?? ""));
  else lista.sort((a, b) => (b.fechaActivacion ?? "").localeCompare(a.fechaActivacion ?? "")); // nuevo

  return lista;
}

export async function statsMembresias(): Promise<StatsMembresias> {
  const r = await consulta(
    `select count(*)::int total,
            count(*) filter (where estado_actual='activo')::int activas,
            count(*) filter (where estado_actual='pausado')::int pausadas,
            count(*) filter (where estado_actual='cancelado')::int canceladas,
            count(*) filter (where incluye_crm_en_marketing)::int agencia
       from public.clientes`,
  );
  const c = r[0]!;
  return {
    total: Number(c.total), activas: Number(c.activas), pausadas: Number(c.pausadas),
    canceladas: Number(c.canceladas), agencia: Number(c.agencia),
  };
}
