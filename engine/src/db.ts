/**
 * Capa de carga de datos.
 *
 * Hoy lee de la base SQLite de la Fase 1 (comisiones_cs.db) usando el módulo
 * nativo `node:sqlite` (Node >= 22, experimental). En producción (Supabase/
 * Postgres) se implementará el mismo contrato `FuenteDatos` contra Postgres,
 * sin tocar el motor de `rules.ts`.
 */

import { createRequire } from "node:module";
import type { DatabaseSync as DatabaseSyncType } from "node:sqlite";
import type { Cliente, Colaborador } from "./types.js";

// `node:sqlite` es un builtin experimental (Node >= 22). Se carga por require
// en runtime para que empaquetadores (Vite/vitest) no intenten resolverlo de
// forma estática. Requiere ejecutar Node con `--experimental-sqlite`.
const require = createRequire(import.meta.url);
const { DatabaseSync } = require("node:sqlite") as typeof import("node:sqlite");

export interface FuenteDatos {
  cargarClientes(): Cliente[];
  cargarColaboradores(): Colaborador[];
  colaboradorPorNombre(nombre: string): Colaborador | undefined;
}

export class FuenteSQLite implements FuenteDatos {
  private db: DatabaseSyncType;

  constructor(rutaDb: string) {
    this.db = new DatabaseSync(rutaDb, { readOnly: true });
  }

  cargarClientes(): Cliente[] {
    const rows = this.db
      .prepare(
        `SELECT id, nombre, fecha_activacion, estado_actual, fecha_cancelacion
           FROM clientes`,
      )
      .all() as Array<Record<string, unknown>>;
    return rows.map((r) => ({
      id: Number(r.id),
      nombre: String(r.nombre),
      fechaActivacion: (r.fecha_activacion as string | null) ?? null,
      estadoActual: r.estado_actual as Cliente["estadoActual"],
      fechaCancelacion: (r.fecha_cancelacion as string | null) ?? null,
    }));
  }

  cargarColaboradores(): Colaborador[] {
    const rows = this.db
      .prepare(
        `SELECT id, nombre, rol, categoria, fecha_ingreso, fecha_fin_prueba
           FROM colaboradores`,
      )
      .all() as Array<Record<string, unknown>>;
    return rows.map((r) => ({
      id: Number(r.id),
      nombre: String(r.nombre),
      rol: r.rol as Colaborador["rol"],
      categoria: (r.categoria as Colaborador["categoria"]) ?? null,
      fechaIngreso: (r.fecha_ingreso as string | null) ?? null,
      fechaFinPrueba: (r.fecha_fin_prueba as string | null) ?? null,
    }));
  }

  colaboradorPorNombre(nombre: string): Colaborador | undefined {
    return this.cargarColaboradores().find((c) => c.nombre === nombre);
  }

  close(): void {
    this.db.close();
  }
}
