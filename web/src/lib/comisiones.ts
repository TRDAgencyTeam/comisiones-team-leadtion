import "server-only";
import { calcularComision } from "comisiones-cs-engine/rules";
import type { Cliente, Colaborador, HitoDetalle } from "comisiones-cs-engine/types";
import { consulta, fuente } from "@/lib/db";

/**
 * Capa que une el CÁLCULO del motor (qué hitos se alcanzaron a una fecha) con el
 * REGISTRO DE PAGOS persistido en la tabla `comision_hitos`. Produce las vistas
 * que consume el panel: cada hito marcado como 'pendiente' o 'pagado'.
 */

export type EstadoHito = "pendiente" | "pagado";

export interface HitoVista extends HitoDetalle {
  estado: EstadoHito;
  /** Fecha de liquidación (ISO) si ya se pagó. */
  pagadoEn: string | null;
}

export interface LineaVista {
  clienteId: number;
  clienteNombre: string;
  fechaActivacion: string;
  hitos: HitoVista[];
  subtotal: number;
  subtotalPendiente: number;
  subtotalPagado: number;
}

export interface ResultadoVista {
  colaboradorId: number;
  colaboradorNombre: string;
  categoria: string | null;
  enPeriodoPrueba: boolean;
  activo: boolean;
  lineas: LineaVista[];
  total: number;
  totalPendiente: number;
  totalPagado: number;
}

interface PagoRow {
  colaborador_id: number;
  cliente_id: number;
  hito: string;
  liquidado_en: string | Date | null;
}

/** Clave única de un hito liquidado. */
const clave = (colaboradorId: number, clienteId: number, hito: string) =>
  `${colaboradorId}:${clienteId}:${hito}`;

/** Carga el mapa de hitos ya pagados (clave -> fecha de liquidación ISO). */
async function cargarPagados(): Promise<Map<string, string | null>> {
  const rows = (await consulta(
    `select colaborador_id, cliente_id, hito, liquidado_en from public.comision_hitos`,
  )) as unknown as PagoRow[];
  const mapa = new Map<string, string | null>();
  for (const r of rows) {
    const fecha =
      r.liquidado_en instanceof Date
        ? r.liquidado_en.toISOString()
        : (r.liquidado_en ?? null);
    mapa.set(clave(r.colaborador_id, r.cliente_id, r.hito), fecha);
  }
  return mapa;
}

/**
 * Calcula, para todos los colaboradores que comisionan, sus líneas con estado de
 * pago a una fecha de corte.
 */
export async function cargarResultados(corte: string): Promise<ResultadoVista[]> {
  const [clientes, colaboradores, pagados, activos] = await Promise.all([
    fuente.cargarClientes(),
    fuente.cargarColaboradores(),
    cargarPagados(),
    cargarActivos(),
  ]);

  return colaboradores
    .filter((c) => c.categoria === "fundador" || c.categoria === "nuevo")
    .map((c) => construirVista(c, clientes, corte, pagados, activos.get(c.id) ?? true))
    .sort((a, b) => b.totalPendiente - a.totalPendiente || b.total - a.total);
}

/** Mapa colaboradorId -> activo (el motor no maneja el flag `activo`). */
async function cargarActivos(): Promise<Map<number, boolean>> {
  const rows = await consulta(`select id, activo from public.colaboradores`);
  return new Map(rows.map((r) => [Number(r.id), Boolean(r.activo)]));
}

function construirVista(
  colaborador: Colaborador,
  clientes: Cliente[],
  corte: string,
  pagados: Map<string, string | null>,
  activo: boolean,
): ResultadoVista {
  const r = calcularComision(colaborador, clientes, corte);

  const lineas: LineaVista[] = r.lineas.map((l) => {
    const hitos: HitoVista[] = l.hitos.map((h) => {
      const k = clave(r.colaboradorId, l.clienteId, h.hito);
      const pagado = pagados.has(k);
      return { ...h, estado: pagado ? "pagado" : "pendiente", pagadoEn: pagados.get(k) ?? null };
    });
    const subtotalPagado = suma(hitos.filter((h) => h.estado === "pagado"));
    const subtotalPendiente = suma(hitos.filter((h) => h.estado === "pendiente"));
    return {
      clienteId: l.clienteId,
      clienteNombre: l.clienteNombre,
      fechaActivacion: l.fechaActivacion,
      hitos,
      subtotal: l.subtotal,
      subtotalPendiente,
      subtotalPagado,
    };
  });

  return {
    colaboradorId: r.colaboradorId,
    colaboradorNombre: r.colaboradorNombre,
    categoria: r.categoria,
    enPeriodoPrueba: r.enPeriodoPrueba,
    activo,
    lineas,
    total: r.total,
    totalPendiente: round2(lineas.reduce((s, l) => s + l.subtotalPendiente, 0)),
    totalPagado: round2(lineas.reduce((s, l) => s + l.subtotalPagado, 0)),
  };
}

const suma = (hs: HitoVista[]) => round2(hs.reduce((s, h) => s + h.monto, 0));
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
