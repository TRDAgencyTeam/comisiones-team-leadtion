/**
 * Tipos de dominio del motor de comisiones CS (LEADTION).
 *
 * El motor es PURO: opera sobre estos objetos de dominio, no sobre la base de
 * datos. La carga de datos (SQLite hoy, Supabase/Postgres en producción) vive
 * en `db.ts` y produce estos tipos. Así las pruebas de la Sección 6 corren sin
 * infraestructura y el mismo motor sirve en Vercel.
 */

/** Fecha en formato ISO 'YYYY-MM-DD' (sin hora, sin zona horaria). */
export type ISODate = string;

export type CategoriaColaborador = "fundador" | "nuevo";
export type RolColaborador = "admin" | "cs" | "comercial";
export type EstadoCliente = "activo" | "cancelado" | "pausado";

export interface Colaborador {
  id: number;
  nombre: string;
  rol: RolColaborador;
  /** NULL para admin/comercial; el motor solo comisiona categorías 'fundador'/'nuevo'. */
  categoria: CategoriaColaborador | null;
  /** Define la ventana de elegibilidad para 'nuevo'. Fundadores: 2026-03-01. */
  fechaIngreso: ISODate | null;
  /** fechaIngreso + 3 meses. NULL para fundadores. */
  fechaFinPrueba: ISODate | null;
}

export interface Cliente {
  id: number;
  nombre: string;
  fechaActivacion: ISODate | null;
  estadoActual: EstadoCliente;
  /** NULL si sigue activo. */
  fechaCancelacion: ISODate | null;
}

/** Identificadores de los tres hitos de comisión. */
export type Hito = "T1" | "T2" | "T3";

/** Detalle de un hito alcanzado por un cliente, para un colaborador dado. */
export interface HitoDetalle {
  hito: Hito;
  /** Fecha calendario en que el cliente cumple el hito (activación + N meses). */
  fechaHito: ISODate;
  /** Base de licencia usada ($67 antes de abril 2026, $69 desde abril 2026). */
  base: number;
  /** Tasa aplicada al hito (0.05, 0.05, 0.10). */
  tasa: number;
  /** Meses de base acumulados en el hito (3, 3, 12). */
  mesesBase: number;
  /** Monto del hito = base * tasa * mesesBase. */
  monto: number;
  /**
   * Estado del CHS para este hito. El CHS real aún no existe (encuesta manual
   * aprobada por el admin), así que por defecto es 'pendiente' y NO bloquea el
   * cálculo de referencia. El admin lo aprueba luego.
   */
  chs: "pendiente" | "aprobado" | "rechazado";
}

/** Resultado de comisión para un cliente elegible, en un corte dado. */
export interface LineaComision {
  clienteId: number;
  clienteNombre: string;
  fechaActivacion: ISODate;
  /** Hitos alcanzados (y no bloqueados) a la fecha de corte. */
  hitos: HitoDetalle[];
  /** Suma de los montos de `hitos`. */
  subtotal: number;
}

/** Cliente considerado pero NO elegible en este corte, con el motivo. */
export interface LineaExcluida {
  clienteId: number;
  clienteNombre: string;
  fechaActivacion: ISODate | null;
  motivo: string;
}

/** Salida completa del cálculo para (colaborador, corte). */
export interface ResultadoComision {
  colaboradorId: number;
  colaboradorNombre: string;
  categoria: CategoriaColaborador | null;
  fechaCorte: ISODate;
  /** True si el colaborador 'nuevo' aún está en periodo de prueba al corte. */
  enPeriodoPrueba: boolean;
  lineas: LineaComision[];
  excluidos: LineaExcluida[];
  /** Suma de todos los subtotales de `lineas`. */
  total: number;
}
