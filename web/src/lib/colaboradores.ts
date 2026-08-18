import "server-only";
import { consulta } from "@/lib/db";

/** Datos y consultas de la sección Colaboradores (lista, ficha). */

export type Rol = "admin" | "cs" | "comercial";
export type Categoria = "fundador" | "nuevo";

export interface Colaborador {
  id: number;
  nombre: string;
  rol: Rol;
  categoria: Categoria | null;
  fechaIngreso: string | null;
  fechaFinPrueba: string | null;
  activo: boolean;
  email: string | null;
}

function toISO(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function mapRow(r: Record<string, unknown>): Colaborador {
  return {
    id: Number(r.id),
    nombre: String(r.nombre),
    rol: r.rol as Rol,
    categoria: (r.categoria as Categoria | null) ?? null,
    fechaIngreso: toISO(r.fecha_ingreso),
    fechaFinPrueba: toISO(r.fecha_fin_prueba),
    activo: Boolean(r.activo),
    email: (r.email as string) ?? null,
  };
}

/** Lista todos los colaboradores, comisionantes primero. */
export async function listarColaboradores(): Promise<Colaborador[]> {
  const rows = await consulta(
    `select id, nombre, rol, categoria, fecha_ingreso, fecha_fin_prueba, activo, email
       from public.colaboradores
      order by (categoria is null), fecha_ingreso, nombre`,
  );
  return rows.map(mapRow);
}

/** Ficha de un colaborador por id. */
export async function obtenerColaborador(id: number): Promise<Colaborador | null> {
  const rows = await consulta(
    `select id, nombre, rol, categoria, fecha_ingreso, fecha_fin_prueba, activo, email
       from public.colaboradores where id = $1`,
    [id],
  );
  return rows.length ? mapRow(rows[0]!) : null;
}
