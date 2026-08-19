import "server-only";
import { consulta } from "@/lib/db";

/**
 * Dinámica de cobros de cada servicio especial de Leadtion.
 *
 * Cada entrada es un mes de la ventana del servicio, con desfase `offset`
 * respecto al mes de inicio (0 = mes 1, 1 = mes 2, 2 = mes 3). Del mes 4 en
 * adelante NO se autogenera nada: se decide manualmente qué hacer con el cliente.
 */
export type TipoServicio = "agente_ai" | "reactivacion" | "level_up";
export type EstadoMes = "activo" | "garantia";

export interface MesServicio {
  offset: number;
  valor: number;
  estado: EstadoMes;
  concepto: string;
}

export const SERVICIO_LABEL: Record<TipoServicio, string> = {
  agente_ai: "Agente IA",
  reactivacion: "Reactivación",
  level_up: "Level Up",
};

/** Precio estándar (mes 1) de cada servicio, si no se personaliza. */
export const PRECIO_MES1_ESTANDAR: Record<TipoServicio, number> = {
  agente_ai: 847,
  reactivacion: 597,
  level_up: 497,
};

/**
 * Devuelve el calendario de cobros del servicio.
 * @param soporteValor  valor del soporte del mes 3 (Agente IA: 119 o 157).
 * @param precioMes1    precio del mes 1 negociado (override); NULL = estándar.
 */
export function calendarioServicio(
  tipo: TipoServicio,
  soporteValor: number | null,
  precioMes1?: number | null,
): MesServicio[] {
  const m1 = precioMes1 != null ? precioMes1 : PRECIO_MES1_ESTANDAR[tipo];
  switch (tipo) {
    case "agente_ai":
      return [
        { offset: 0, valor: m1, estado: "activo", concepto: "Agente IA — mes 1" },
        { offset: 1, valor: 0, estado: "garantia", concepto: "Garantía (sin licencia; API la asume Leadtion)" },
        { offset: 2, valor: soporteValor ?? 119, estado: "activo", concepto: "Soporte (mes 3)" },
      ];
    case "reactivacion":
      return [
        { offset: 0, valor: m1, estado: "activo", concepto: "Reactivación — mes 1" },
        { offset: 1, valor: 197, estado: "activo", concepto: "Reactivación — mes 2" },
        { offset: 2, valor: 197, estado: "activo", concepto: "Reactivación — mes 3" },
      ];
    case "level_up":
      // Mes 1 $497 (o el precio negociado). Del mes 2 en adelante el cliente elige
      // soporte (cualquiera) o se queda sin soporte; se registra manualmente.
      return [
        { offset: 0, valor: m1, estado: "activo", concepto: "Level Up — mes 1" },
      ];
    default:
      return [];
  }
}

export interface ServicioRow {
  id: number;
  tipoServicio: TipoServicio;
  mesInicio: string;
  fechaCompra: string | null;
  soporteValor: number | null;
  precioMes1: number | null;
  bono: number | null;
  nota: string | null;
}

const isoDia = (v: unknown): string | null =>
  v == null ? null : (v instanceof Date ? v.toISOString() : String(v)).slice(0, 10);

/** Un servicio por id (para editarlo). */
export async function obtenerServicio(id: number): Promise<(ServicioRow & { clienteId: number }) | null> {
  const rows = await consulta(
    `select id, cliente_id, tipo_servicio, mes_inicio, fecha_compra, soporte_valor, precio_mes1, bono_reactivacion, nota
       from public.cliente_servicios where id=$1`,
    [id],
  );
  if (rows.length === 0) return null;
  const r = rows[0]!;
  return {
    id: Number(r.id),
    clienteId: Number(r.cliente_id),
    tipoServicio: r.tipo_servicio as TipoServicio,
    mesInicio: isoDia(r.mes_inicio)!,
    fechaCompra: isoDia(r.fecha_compra),
    soporteValor: r.soporte_valor == null ? null : Number(r.soporte_valor),
    precioMes1: r.precio_mes1 == null ? null : Number(r.precio_mes1),
    bono: r.bono_reactivacion == null ? null : Number(r.bono_reactivacion),
    nota: (r.nota as string) ?? null,
  };
}

/** Servicios registrados de un cliente (línea de tiempo). */
export async function serviciosDeCliente(clienteId: number): Promise<ServicioRow[]> {
  const rows = await consulta(
    `select id, tipo_servicio, mes_inicio, fecha_compra, soporte_valor, precio_mes1, bono_reactivacion, nota
       from public.cliente_servicios where cliente_id=$1 order by coalesce(fecha_compra, mes_inicio)`,
    [clienteId],
  );
  return rows.map((r) => ({
    id: Number(r.id),
    tipoServicio: r.tipo_servicio as TipoServicio,
    mesInicio: isoDia(r.mes_inicio)!,
    fechaCompra: isoDia(r.fecha_compra),
    soporteValor: r.soporte_valor == null ? null : Number(r.soporte_valor),
    precioMes1: r.precio_mes1 == null ? null : Number(r.precio_mes1),
    bono: r.bono_reactivacion == null ? null : Number(r.bono_reactivacion),
    nota: (r.nota as string) ?? null,
  }));
}
