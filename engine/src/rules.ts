/**
 * Motor de reglas de comisión — CS (LEADTION), Fase 2.
 *
 * Fuente de verdad: `POLÍTICA INTEGRAL DE COMISIONES - CS (T&C).docx`, resumida
 * en CONTEXTO_TRASPASO_CLAUDE_CODE.md (secciones 3 y 6). Este archivo reproduce
 * exactamente los casos de prueba de la Sección 6.
 *
 * Reglas implementadas:
 *  - Vigencia: solo clientes activados desde 2026-03-01.
 *  - Ventana por categoría:
 *      · fundador → todos los clientes activados desde 2026-03-01.
 *      · nuevo    → solo clientes activados desde su fechaIngreso.
 *  - Base de licencia por fecha de activación: $67 antes de abril 2026, $69
 *    desde abril 2026 (independiente del valor mostrado del cliente).
 *  - Hitos (relativos a la activación individual del cliente):
 *      · T1 (mes 4  = activación + 3 meses):  5% × 3 × base.  CHS mín. > 70.
 *      · T2 (mes 7  = activación + 6 meses):  5% × 3 × base.  CHS mín. > 70.
 *      · T3 (mes 13 = activación + 12 meses): 10% × 12 × base. CHS mín. > 80.
 *    Un hito cuenta si el corte >= su fecha y el cliente seguía activo al
 *    llegar a esa fecha. Cada colaborador elegible cobra el 100% del hito.
 *  - Barrera de 90 días: cancelar antes de 90 días => nunca comisiona (nadie).
 *  - CHS: aún no existe (encuesta manual aprobada por admin). Por defecto es
 *    'pendiente' y NO bloquea el cálculo de referencia.
 */

import { addMonths, diffDias, gte, lt } from "./dates.js";
import type {
  Cliente,
  Colaborador,
  Hito,
  HitoDetalle,
  ISODate,
  LineaComision,
  LineaExcluida,
  ResultadoComision,
} from "./types.js";

/** Inicio de vigencia de comisiones. */
export const VIGENCIA_COMISIONES: ISODate = "2026-03-01";
/** Frontera de cambio de base de licencia. */
export const FRONTERA_BASE: ISODate = "2026-04-01";
export const BASE_ANTES = 67;
export const BASE_DESDE = 69;
/** Barrera dura: cancelación antes de este número de días => nunca comisiona. */
export const BARRERA_DIAS = 90;

interface DefHito {
  hito: Hito;
  /** Meses calendario desde la activación hasta cumplir el hito. */
  offsetMeses: number;
  tasa: number;
  mesesBase: number;
  chsMinimo: number;
}

/** Definición de los tres hitos (tasas ya renegociadas a 5/5/10). */
export const HITOS: DefHito[] = [
  { hito: "T1", offsetMeses: 3, tasa: 0.05, mesesBase: 3, chsMinimo: 70 },
  { hito: "T2", offsetMeses: 6, tasa: 0.05, mesesBase: 3, chsMinimo: 70 },
  { hito: "T3", offsetMeses: 12, tasa: 0.1, mesesBase: 12, chsMinimo: 80 },
];

/** Base de licencia según la fecha de activación del cliente. */
export function baseLicencia(fechaActivacion: ISODate): number {
  return lt(fechaActivacion, FRONTERA_BASE) ? BASE_ANTES : BASE_DESDE;
}

/** Inicio de la ventana de elegibilidad de un colaborador. */
export function inicioVentana(colaborador: Colaborador): ISODate | null {
  if (colaborador.categoria === "fundador") return VIGENCIA_COMISIONES;
  if (colaborador.categoria === "nuevo") {
    // Un 'nuevo' nunca es retroactivo antes de su ingreso, ni antes de vigencia.
    const ingreso = colaborador.fechaIngreso;
    if (!ingreso) return null;
    return gte(ingreso, VIGENCIA_COMISIONES) ? ingreso : VIGENCIA_COMISIONES;
  }
  return null; // admin / comercial no comisionan
}

/**
 * ¿La cancelación del cliente ocurrió antes de la barrera de 90 días? Si es así,
 * no genera comisión para nadie, nunca.
 */
export function canceladoAntesDeBarrera(cliente: Cliente): boolean {
  if (cliente.estadoActual !== "cancelado" || !cliente.fechaCancelacion) return false;
  if (!cliente.fechaActivacion) return false;
  return diffDias(cliente.fechaActivacion, cliente.fechaCancelacion) < BARRERA_DIAS;
}

/**
 * ¿El cliente seguía activo al momento de cumplir el hito en `fechaHito`?
 * Un hito acumulado (ej. meses 2-3-4) solo se paga si el cliente no canceló
 * antes de llegar al corte del hito.
 */
function activoAlHito(cliente: Cliente, fechaHito: ISODate): boolean {
  if (cliente.estadoActual !== "cancelado" || !cliente.fechaCancelacion) return true;
  // Cancelado: cuenta solo si la cancelación fue en o después de la fecha del hito.
  return gte(cliente.fechaCancelacion, fechaHito);
}

export interface OpcionesCalculo {
  /**
   * Estado de CHS por (clienteId, hito). Si no se provee, se asume 'pendiente'.
   * Con `bloquearPorChs=false` (por defecto), 'pendiente' NO bloquea el pago.
   */
  chs?: (clienteId: number, hito: Hito) => "pendiente" | "aprobado" | "rechazado";
  /**
   * Si true, solo se pagan hitos con CHS 'aprobado'. Por defecto false: el CHS
   * aún no existe, así que 'pendiente' se incluye (cálculo de referencia).
   */
  bloquearPorChs?: boolean;
  /**
   * Filtro opcional de hitos a considerar (ej. solo pagar hitos aún no
   * liquidados en cortes previos). Por defecto: todos los hitos alcanzados.
   */
  hitosAConsiderar?: Hito[];
}

/**
 * Calcula los hitos alcanzados por un cliente para un colaborador a una fecha
 * de corte. Devuelve [] si el cliente no aplica (fuera de ventana, barrera, etc).
 */
function hitosDeCliente(
  cliente: Cliente,
  fechaCorte: ISODate,
  opciones: OpcionesCalculo,
): HitoDetalle[] {
  if (!cliente.fechaActivacion) return [];
  const base = baseLicencia(cliente.fechaActivacion);
  const chsFn = opciones.chs ?? (() => "pendiente" as const);
  const permitidos = opciones.hitosAConsiderar;

  const detalles: HitoDetalle[] = [];
  for (const def of HITOS) {
    if (permitidos && !permitidos.includes(def.hito)) continue;
    const fechaHito = addMonths(cliente.fechaActivacion, def.offsetMeses);
    if (lt(fechaCorte, fechaHito)) continue; // aún no llega al hito
    if (!activoAlHito(cliente, fechaHito)) continue; // canceló antes del hito
    const chs = chsFn(cliente.id, def.hito);
    if (opciones.bloquearPorChs && chs !== "aprobado") continue;
    detalles.push({
      hito: def.hito,
      fechaHito,
      base,
      tasa: def.tasa,
      mesesBase: def.mesesBase,
      monto: round2(base * def.tasa * def.mesesBase),
      chs,
    });
  }
  return detalles;
}

/**
 * Calcula la comisión de un colaborador a una fecha de corte, sobre el universo
 * de clientes. Reproduce exactamente los casos de la Sección 6.
 */
export function calcularComision(
  colaborador: Colaborador,
  clientes: Cliente[],
  fechaCorte: ISODate,
  opciones: OpcionesCalculo = {},
): ResultadoComision {
  const inicio = inicioVentana(colaborador);
  const enPeriodoPrueba =
    colaborador.categoria === "nuevo" &&
    !!colaborador.fechaFinPrueba &&
    lt(fechaCorte, colaborador.fechaFinPrueba);

  const lineas: LineaComision[] = [];
  const excluidos: LineaExcluida[] = [];

  // Colaborador que no comisiona (admin/comercial o sin ventana): resultado vacío.
  if (!inicio) {
    return {
      colaboradorId: colaborador.id,
      colaboradorNombre: colaborador.nombre,
      categoria: colaborador.categoria,
      fechaCorte,
      enPeriodoPrueba,
      lineas: [],
      excluidos: [],
      total: 0,
    };
  }

  for (const c of clientes) {
    if (!c.fechaActivacion) {
      excluidos.push(excluir(c, "sin fecha de activación"));
      continue;
    }
    // Cuenta pausada/congelada: no está pagando, no genera comisión mientras dure.
    if (c.estadoActual === "pausado") {
      excluidos.push(excluir(c, "cuenta pausada/congelada (no genera comisión)"));
      continue;
    }
    // Fuera de la ventana de elegibilidad del colaborador.
    if (lt(c.fechaActivacion, inicio)) {
      excluidos.push(excluir(c, `activado antes de la ventana (${inicio})`));
      continue;
    }
    // Barrera de 90 días: no comisiona para nadie, nunca.
    if (canceladoAntesDeBarrera(c)) {
      excluidos.push(excluir(c, "canceló antes de 90 días (barrera)"));
      continue;
    }
    const hitos = hitosDeCliente(c, fechaCorte, opciones);
    if (hitos.length === 0) {
      excluidos.push(excluir(c, "aún no alcanza ningún hito al corte"));
      continue;
    }
    const subtotal = round2(hitos.reduce((s, h) => s + h.monto, 0));
    lineas.push({
      clienteId: c.id,
      clienteNombre: c.nombre,
      fechaActivacion: c.fechaActivacion,
      hitos,
      subtotal,
    });
  }

  lineas.sort((a, b) => a.fechaActivacion.localeCompare(b.fechaActivacion));
  const total = round2(lineas.reduce((s, l) => s + l.subtotal, 0));

  return {
    colaboradorId: colaborador.id,
    colaboradorNombre: colaborador.nombre,
    categoria: colaborador.categoria,
    fechaCorte,
    enPeriodoPrueba,
    lineas,
    excluidos,
    total,
  };
}

function excluir(c: Cliente, motivo: string): LineaExcluida {
  return {
    clienteId: c.id,
    clienteNombre: c.nombre,
    fechaActivacion: c.fechaActivacion,
    motivo,
  };
}

/** Redondeo a 2 decimales evitando errores binarios de coma flotante. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
