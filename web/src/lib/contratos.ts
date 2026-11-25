import "server-only";
import { consulta } from "@/lib/db";
import type { VarsPlanMarketing } from "@/lib/contrato-plantilla";

export type EstadoContrato = "borrador" | "enviado" | "visto" | "firmado" | "vencido" | "anulado";

export interface Contrato {
  id: number;
  uuid: string;
  clienteId: number | null;
  clienteNombre: string;
  clienteEmail: string | null;
  clienteDomicilio: string | null;
  plantilla: string;
  titulo: string | null;
  variables: VarsPlanMarketing;
  estado: EstadoContrato;
  valorResumen: string | null;
  vigenciaResumen: string | null;
  fechaEnvio: string | null;
  fechaVence: string | null;
  fechaFirma: string | null;
  firmaTipo: string | null;
  firmaData: string | null;
  firmaFuente: string | null;
  recordatorioDias: number;
  creadoEn: string;
  actualizadoEn: string;
}

export interface EventoContrato { tipo: string | null; descripcion: string | null; fecha: string }

const iso = (v: unknown): string | null =>
  v == null ? null : v instanceof Date ? v.toISOString() : String(v);

function mapRow(r: Record<string, unknown>): Contrato {
  return {
    id: Number(r.id),
    uuid: String(r.uuid),
    clienteId: r.cliente_id != null ? Number(r.cliente_id) : null,
    clienteNombre: String(r.cliente_nombre),
    clienteEmail: (r.cliente_email as string) ?? null,
    clienteDomicilio: (r.cliente_domicilio as string) ?? null,
    plantilla: String(r.plantilla),
    titulo: (r.titulo as string) ?? null,
    variables: (r.variables as VarsPlanMarketing) ?? ({} as VarsPlanMarketing),
    estado: String(r.estado) as EstadoContrato,
    valorResumen: (r.valor_resumen as string) ?? null,
    vigenciaResumen: (r.vigencia_resumen as string) ?? null,
    fechaEnvio: iso(r.fecha_envio),
    fechaVence: iso(r.fecha_vence),
    fechaFirma: iso(r.fecha_firma),
    firmaTipo: (r.firma_tipo as string) ?? null,
    firmaData: (r.firma_data as string) ?? null,
    firmaFuente: (r.firma_fuente as string) ?? null,
    recordatorioDias: r.recordatorio_dias != null ? Number(r.recordatorio_dias) : 1,
    creadoEn: iso(r.creado_en)!,
    actualizadoEn: iso(r.actualizado_en)!,
  };
}

const CAMPOS = `id, uuid, cliente_id, cliente_nombre, cliente_email, cliente_domicilio, plantilla,
  titulo, variables, estado, valor_resumen, vigencia_resumen, fecha_envio, fecha_vence, fecha_firma,
  firma_tipo, firma_data, firma_fuente, recordatorio_dias, creado_en, actualizado_en`;

export async function listarContratos(): Promise<Contrato[]> {
  const rows = await consulta(`select ${CAMPOS} from public.contrato order by creado_en desc`);
  return rows.map(mapRow);
}

export async function obtenerContrato(id: number): Promise<Contrato | null> {
  const rows = await consulta(`select ${CAMPOS} from public.contrato where id = $1`, [id]);
  return rows.length ? mapRow(rows[0] as Record<string, unknown>) : null;
}

export async function eventosContrato(id: number): Promise<EventoContrato[]> {
  const rows = await consulta(
    `select tipo, descripcion, creado_en from public.contrato_evento where contrato_id = $1 order by creado_en desc`,
    [id],
  );
  return rows.map((r: Record<string, unknown>) => ({
    tipo: (r.tipo as string) ?? null, descripcion: (r.descripcion as string) ?? null, fecha: iso(r.creado_en)!,
  }));
}

export async function registrarEvento(id: number, tipo: string, descripcion: string): Promise<void> {
  await consulta(`insert into public.contrato_evento (contrato_id, tipo, descripcion) values ($1,$2,$3)`, [id, tipo, descripcion]);
}

/** Resumen por estado para los KPIs. */
export async function resumenContratos(): Promise<Record<string, number>> {
  const rows = await consulta(`select estado, count(*)::int n from public.contrato group by estado`);
  const m: Record<string, number> = {};
  for (const r of rows as Record<string, unknown>[]) m[String(r.estado)] = Number(r.n);
  return m;
}
