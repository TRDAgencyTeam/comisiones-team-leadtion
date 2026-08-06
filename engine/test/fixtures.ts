/**
 * Fixtures deterministas derivados de la base real de la Fase 1 (comisiones_cs.db),
 * limitados al universo relevante para los casos de la Sección 6: los 24 clientes
 * activados desde 2026-03-01, más dos clientes pre-marzo para probar exclusión por
 * ventana. Se usan en las pruebas puras del motor (sin dependencia de SQLite).
 */

import type { Cliente, Colaborador } from "../src/types.js";

export const COLABORADORES = {
  andres: {
    id: 1,
    nombre: "Andrés Rodríguez",
    rol: "cs",
    categoria: "fundador",
    fechaIngreso: "2026-03-01",
    fechaFinPrueba: null,
  },
  daniel: {
    id: 2,
    nombre: "Daniel Franco",
    rol: "cs",
    categoria: "fundador",
    fechaIngreso: "2026-03-01",
    fechaFinPrueba: null,
  },
  alejandro: {
    id: 3,
    nombre: "Alejandro",
    rol: "cs",
    categoria: "nuevo",
    fechaIngreso: "2026-05-05",
    fechaFinPrueba: "2026-08-05",
  },
  mauro: {
    id: 4,
    nombre: "Mauro",
    rol: "admin",
    categoria: null,
    fechaIngreso: null,
    fechaFinPrueba: null,
  },
} satisfies Record<string, Colaborador>;

function activo(
  id: number,
  nombre: string,
  fechaActivacion: string,
): Cliente {
  return { id, nombre, fechaActivacion, estadoActual: "activo", fechaCancelacion: null };
}
function cancelado(
  id: number,
  nombre: string,
  fechaActivacion: string,
  fechaCancelacion: string,
): Cliente {
  return { id, nombre, fechaActivacion, estadoActual: "cancelado", fechaCancelacion };
}

/** Los 24 clientes activados desde 2026-03-01 (datos reales verificados). */
export const CLIENTES: Cliente[] = [
  // --- Marzo (8; 2 cancelados antes de su hito) ---
  cancelado(40, "Constantino Trimarchi", "2026-03-02", "2026-06-01"),
  activo(39, "Cero suposiciones", "2026-03-03"),
  activo(41, "Martha Laverde", "2026-03-04"),
  activo(42, "Yosmar Cutcher", "2026-03-17"),
  cancelado(43, "Iris Mar Aguilera", "2026-03-19", "2026-06-01"),
  cancelado(44, "Vanessa Figueroa", "2026-03-25", "2026-07-01"), // cancela DESPUÉS del mes 4 → sí cuenta
  activo(45, "Marcela Cazares", "2026-03-27"),
  activo(46, "Helen Moreno (Milton)", "2026-03-31"),
  // --- Abril (6, todos activos) → base $69 ---
  activo(47, "Sandra Aparicio", "2026-04-09"),
  activo(48, "Sandra Guerra", "2026-04-15"),
  activo(49, "Irma Diaz", "2026-04-28"),
  activo(50, "Gabriela Dabiot", "2026-04-29"),
  activo(51, "Francisco Lara (THE GLOBAL TEAM FL LLC)", "2026-04-29"),
  activo(52, "Ivelisse medina", "2026-04-29"),
  // --- Mayo (2) → cartera de Alejandro ---
  activo(53, "Yolanda uzeta", "2026-05-11"), // hito T1 = 2026-08-11
  activo(54, "Katherine Osorio", "2026-05-18"), // hito T1 = 2026-08-18
  // --- Junio/Julio → hitos posteriores ---
  activo(55, "Melida Cabral", "2026-06-03"), // hito T1 = 2026-09-03
  cancelado(56, "Carolina Quijano", "2026-06-19", "2026-08-01"), // barrera: 43 días < 90
  activo(58, "Maria Jose Rio", "2026-06-24"),
  activo(59, "Biviana Gutierrez", "2026-06-24"),
  activo(60, "Liliana Bustamente", "2026-06-26"),
  activo(57, "Sara Pineda", "2026-06-30"),
  activo(62, "Maria Quintanilla", "2026-07-07"),
  activo(61, "Veronica Valencia", "2026-07-08"),
  // --- Pre-marzo: fuera de vigencia/ventana (control de exclusión) ---
  activo(10, "Cliente Pre-Marzo A", "2026-01-15"),
  activo(11, "Cliente Pre-Marzo B", "2025-12-01"),
];
