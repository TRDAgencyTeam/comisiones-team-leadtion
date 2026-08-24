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
    activo: Boolean(r.activo),
  };
}

const CAMPOS = `id, nombre, area, banco, email, identificacion, fecha_nacimiento,
  fecha_inicio_contrato, duracion_contrato_meses, fecha_fin_contrato, valor_nomina, activo`;

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

/** Días para que venza el contrato (negativo = ya venció); null si no hay fecha. */
export function diasParaVencer(fechaFin: string | null): number | null {
  if (!fechaFin) return null;
  const fin = new Date(`${fechaFin}T00:00:00`);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.round((fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}
