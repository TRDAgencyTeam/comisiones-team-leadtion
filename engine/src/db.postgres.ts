/**
 * Adaptador de datos para Postgres / Supabase (producción).
 *
 * El motor (`rules.ts`) es puro y síncrono sobre arreglos. La carga desde
 * Postgres es asíncrona; por eso este adaptador NO implementa `FuenteDatos`
 * (síncrona), sino que expone cargadores `async`. El flujo en Vercel es:
 *
 *     const fuente = new FuentePostgres(consulta);
 *     const [clientes, colaboradores] = await Promise.all([
 *       fuente.cargarClientes(),
 *       fuente.cargarColaboradores(),
 *     ]);
 *     const r = calcularComision(colaborador, clientes, corte);
 *
 * Es agnóstico de driver: recibe una función `consulta(sql, params) => rows`.
 * Con Supabase se puede usar `postgres` (porsager), `pg` (node-postgres) o el
 * cliente de Supabase con `rpc`/SQL. Ejemplo con `pg`:
 *
 *     import { Pool } from "pg";
 *     const pool = new Pool({ connectionString: process.env.DATABASE_URL });
 *     const consulta = async (sql, params) => (await pool.query(sql, params)).rows;
 *     const fuente = new FuentePostgres(consulta);
 */

import type { Cliente, Colaborador } from "./types.js";

/** Ejecutor de consultas SQL agnóstico de driver. Debe devolver las filas. */
export type ConsultaSQL = (
  sql: string,
  params?: unknown[],
) => Promise<Array<Record<string, unknown>>>;

export class FuentePostgres {
  constructor(private readonly consulta: ConsultaSQL) {}

  async cargarClientes(): Promise<Cliente[]> {
    const rows = await this.consulta(
      `select id, nombre, fecha_activacion, estado_actual, fecha_cancelacion
         from public.clientes`,
    );
    return rows.map((r) => ({
      id: Number(r.id),
      nombre: String(r.nombre),
      fechaActivacion: aISODate(r.fecha_activacion),
      // El motor solo distingue activo/cancelado. Un cliente 'pausado' se trata
      // como activo a efectos de comisión (la pausa es informativa/auditoría).
      estadoActual: r.estado_actual === "cancelado" ? "cancelado" : "activo",
      fechaCancelacion: aISODate(r.fecha_cancelacion),
    }));
  }

  async cargarColaboradores(): Promise<Colaborador[]> {
    const rows = await this.consulta(
      `select id, nombre, rol, categoria, fecha_ingreso, fecha_fin_prueba
         from public.colaboradores`,
    );
    return rows.map((r) => ({
      id: Number(r.id),
      nombre: String(r.nombre),
      rol: r.rol as Colaborador["rol"],
      categoria: (r.categoria as Colaborador["categoria"]) ?? null,
      fechaIngreso: aISODate(r.fecha_ingreso),
      fechaFinPrueba: aISODate(r.fecha_fin_prueba),
    }));
  }
}

/**
 * Normaliza un valor de fecha de Postgres a 'YYYY-MM-DD'. Los drivers devuelven
 * `Date` o `string`; en ambos casos tomamos solo la parte de fecha en UTC para
 * no introducir corrimientos de zona horaria.
 */
function aISODate(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : s;
}
