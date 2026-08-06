/** Punto de entrada público del motor de comisiones CS (LEADTION), Fase 2. */

export * from "./types.js";
export * from "./dates.js";
export * from "./rules.js";
export { FuenteSQLite } from "./db.js";
export type { FuenteDatos } from "./db.js";
export { FuentePostgres } from "./db.postgres.js";
export type { ConsultaSQL } from "./db.postgres.js";
