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
  /**
   * Cómo cuenta ese mes en el P&L:
   *  - "servicio": ingreso por servicio (Agente IA mes 1, Reactivación cualquier mes, Level Up mes 1).
   *  - "soporte": ya es la mensualidad de soporte (Agente IA mes 3).
   *  - "garantia": mes sin cobro ($0).
   */
  categoria: "servicio" | "soporte" | "garantia";
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
 * @param precioMes1    precio del mes 1 negociado (override); NULL = estándar. Si hay
 *                      cuotas, es el valor de CADA cuota (no el total).
 * @param cuotasN       nº de cuotas del pago único (1 = pago en un solo mes). Solo
 *                      aplica a Agente IA y Level Up; Reactivación tiene su esquema.
 */
export function calendarioServicio(
  tipo: TipoServicio,
  soporteValor: number | null,
  precioMes1?: number | null,
  cuotasN: number = 1,
): MesServicio[] {
  const m1 = precioMes1 != null ? precioMes1 : PRECIO_MES1_ESTANDAR[tipo];
  const nCuotas = Math.max(1, Math.floor(cuotasN || 1));
  switch (tipo) {
    case "agente_ai":
      // Pago en cuotas: cada mes de cuota se cobra el valor de la cuota (es servicio,
      // no garantía). El soporte arranca el mes siguiente a la última cuota.
      if (nCuotas > 1) {
        const meses: MesServicio[] = [];
        for (let i = 0; i < nCuotas; i++) {
          meses.push({ offset: i, valor: m1, estado: "activo", concepto: `Agente IA — cuota ${i + 1} de ${nCuotas}`, categoria: "servicio" });
        }
        meses.push({ offset: nCuotas, valor: soporteValor ?? 157, estado: "activo", concepto: "Soporte (tras las cuotas)", categoria: "soporte" });
        return meses;
      }
      // Mes 1 = servicio (full). Mes 2 = garantía ($0). Mes 3 EN ADELANTE ya es la
      // mensualidad de SOPORTE (nativo $157, o el soporte negociado: 119, etc.).
      return [
        { offset: 0, valor: m1, estado: "activo", concepto: "Agente IA — mes 1", categoria: "servicio" },
        { offset: 1, valor: 0, estado: "garantia", concepto: "Garantía (sin licencia; API la asume Leadtion)", categoria: "garantia" },
        { offset: 2, valor: soporteValor ?? 157, estado: "activo", concepto: "Soporte (desde mes 3)", categoria: "soporte" },
      ];
    case "reactivacion":
      // Los 3 meses son SERVICIO (reactivación).
      return [
        { offset: 0, valor: m1, estado: "activo", concepto: "Reactivación — mes 1", categoria: "servicio" },
        { offset: 1, valor: 197, estado: "activo", concepto: "Reactivación — mes 2", categoria: "servicio" },
        { offset: 2, valor: 197, estado: "activo", concepto: "Reactivación — mes 3", categoria: "servicio" },
      ];
    case "level_up":
      // Pago en cuotas: una línea de servicio por cada cuota. Sin soporte automático.
      if (nCuotas > 1) {
        return Array.from({ length: nCuotas }, (_, i) => ({
          offset: i, valor: m1, estado: "activo" as EstadoMes, concepto: `Level Up — cuota ${i + 1} de ${nCuotas}`, categoria: "servicio" as const,
        }));
      }
      // Mes 1 $497 (o el precio negociado). Del mes 2 en adelante el cliente elige
      // soporte (cualquiera) o se queda sin soporte; se registra manualmente.
      return [
        { offset: 0, valor: m1, estado: "activo", concepto: "Level Up — mes 1", categoria: "servicio" },
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
  cuotasN: number;
  bono: number | null;
  nota: string | null;
}

const isoDia = (v: unknown): string | null =>
  v == null ? null : (v instanceof Date ? v.toISOString() : String(v)).slice(0, 10);

/** Un servicio por id (para editarlo). */
export async function obtenerServicio(id: number): Promise<(ServicioRow & { clienteId: number }) | null> {
  const rows = await consulta(
    `select id, cliente_id, tipo_servicio, mes_inicio, fecha_compra, soporte_valor, precio_mes1, coalesce(cuotas_n,1) cuotas_n, bono_reactivacion, nota
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
    cuotasN: r.cuotas_n == null ? 1 : Number(r.cuotas_n),
    bono: r.bono_reactivacion == null ? null : Number(r.bono_reactivacion),
    nota: (r.nota as string) ?? null,
  };
}

/** Servicios registrados de un cliente (línea de tiempo). */
export async function serviciosDeCliente(clienteId: number): Promise<ServicioRow[]> {
  const rows = await consulta(
    `select id, tipo_servicio, mes_inicio, fecha_compra, soporte_valor, precio_mes1, coalesce(cuotas_n,1) cuotas_n, bono_reactivacion, nota
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
    cuotasN: r.cuotas_n == null ? 1 : Number(r.cuotas_n),
    bono: r.bono_reactivacion == null ? null : Number(r.bono_reactivacion),
    nota: (r.nota as string) ?? null,
  }));
}
