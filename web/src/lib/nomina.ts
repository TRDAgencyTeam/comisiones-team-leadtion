import "server-only";
import { consulta } from "@/lib/db";

/**
 * Nómina (dentro de Gastos Fijos). Lee/gestiona las personas de la tabla única
 * `colaboradores` con sus datos de contrato. Es la fuente de las personas que
 * luego aparecen en el Registro contable (REG).
 */

export interface PersonaNomina {
  id: number;
  nombre: string;
  area: string | null;
  banco: string | null;
  email: string | null;
  identificacion: string | null;
  fechaNacimiento: string | null;
  fechaInicioContrato: string | null;
  duracionMeses: number | null;
  fechaFinContrato: string | null;
  valorNomina: number;
  /** Valor del primer mes (parcial). NULL = primer mes completo. */
  valorPrimerMes: number | null;
  activo: boolean;
}

function toISO(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function mapRow(r: Record<string, unknown>): PersonaNomina {
  return {
    id: Number(r.id),
    nombre: String(r.nombre),
    area: (r.area as string) ?? null,
    banco: (r.banco as string) ?? null,
    email: (r.email as string) ?? null,
    identificacion: (r.identificacion as string) ?? null,
    fechaNacimiento: toISO(r.fecha_nacimiento),
    fechaInicioContrato: toISO(r.fecha_inicio_contrato),
    duracionMeses: r.duracion_contrato_meses != null ? Number(r.duracion_contrato_meses) : null,
    fechaFinContrato: toISO(r.fecha_fin_contrato),
    valorNomina: r.valor_nomina != null ? Number(r.valor_nomina) : 0,
    valorPrimerMes: r.valor_primer_mes != null ? Number(r.valor_primer_mes) : null,
    activo: Boolean(r.activo),
  };
}

const CAMPOS = `id, nombre, area, banco, email, identificacion, fecha_nacimiento,
  fecha_inicio_contrato, duracion_contrato_meses, fecha_fin_contrato, valor_nomina, valor_primer_mes, activo`;

/** Lista toda la nómina (activos primero, luego por área y nombre). */
export async function listarNomina(): Promise<PersonaNomina[]> {
  const rows = await consulta(
    `select ${CAMPOS} from public.colaboradores
      order by activo desc, (area is null), area, nombre`,
  );
  return rows.map(mapRow);
}

/** Ficha de una persona por id. */
export async function obtenerPersona(id: number): Promise<PersonaNomina | null> {
  const rows = await consulta(`select ${CAMPOS} from public.colaboradores where id = $1`, [id]);
  return rows.length ? mapRow(rows[0]!) : null;
}

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export interface NominaMesResumen { mes: string; personas: number; cop: number; usd: number; estimado: boolean }
export interface NominaMesPersona { nombre: string; area: string | null; cop: number; usd: number }

/**
 * Cuadro de nómina de un mes 'YYYY-MM'. Si ese mes tiene snapshot real
 * (egreso_mensual), lo usa (exacto, USD a la tasa de ese mes). Si no (meses
 * previos al registro), lo RECONSTRUYE desde los contratos vigentes ese mes
 * (fecha de inicio/fin) con el salario actual → `estimado=true`.
 */
export async function nominaMesDetalle(mes: string, tasa: number): Promise<{ personas: NominaMesPersona[]; estimado: boolean }> {
  const snap = await consulta(
    `select concepto, marca, coalesce(valor_cop,0)::float cop, coalesce(valor_usd,0)::float usd
       from public.egreso_mensual
      where categoria='fijo' and subcategoria='nomina' and to_char(mes,'YYYY-MM')=$1
      order by valor_cop desc`,
    [mes],
  );
  if (snap.length) {
    return { estimado: false, personas: snap.map((r) => ({ nombre: String(r.concepto), area: (r.marca as string) ?? null, cop: Number(r.cop), usd: Number(r.usd) })) };
  }
  const rec = await consulta(
    `select nombre, area, coalesce(valor_nomina,0)::float vn
       from public.colaboradores
      where coalesce(valor_nomina,0) > 0
        and (fecha_inicio_contrato is null or to_char(fecha_inicio_contrato,'YYYY-MM') <= $1)
        and (fecha_fin_contrato is null or to_char(fecha_fin_contrato,'YYYY-MM') >= $1)
      order by valor_nomina desc`,
    [mes],
  );
  return { estimado: true, personas: rec.map((r) => ({ nombre: String(r.nombre), area: (r.area as string) ?? null, cop: Number(r.vn), usd: tasa > 0 ? r2(Number(r.vn) / tasa) : 0 })) };
}

/** Histórico de los últimos `nMeses` meses PASADOS (excluye el mes en curso). */
export async function historicoNominaPasado(nMeses: number, tasa: number): Promise<NominaMesResumen[]> {
  const now = new Date();
  const out: NominaMesResumen[] = [];
  for (let i = 1; i <= nMeses; i++) {
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth() - i, 1));
    const mes = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const { personas, estimado } = await nominaMesDetalle(mes, tasa);
    out.push({
      mes, personas: personas.length, estimado,
      cop: r2(personas.reduce((s, p) => s + p.cop, 0)),
      usd: r2(personas.reduce((s, p) => s + p.usd, 0)),
    });
  }
  return out;
}

/** Días para que venza el contrato (negativo = ya venció); null si no hay fecha. */
export function diasParaVencer(fechaFin: string | null): number | null {
  if (!fechaFin) return null;
  const fin = new Date(`${fechaFin}T00:00:00`);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.round((fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}
