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

/**
 * Devuelve el calendario de cobros del servicio.
 * @param soporteValor  valor del soporte del mes 3 (Agente IA: 119 o 157).
 */
export function calendarioServicio(tipo: TipoServicio, soporteValor: number | null): MesServicio[] {
  switch (tipo) {
    case "agente_ai":
      return [
        { offset: 0, valor: 847, estado: "activo", concepto: "Agente IA — mes 1" },
        { offset: 1, valor: 0, estado: "garantia", concepto: "Garantía (sin licencia; API la asume Leadtion)" },
        { offset: 2, valor: soporteValor ?? 119, estado: "activo", concepto: "Soporte (mes 3)" },
      ];
    case "reactivacion":
      return [
        { offset: 0, valor: 597, estado: "activo", concepto: "Reactivación — mes 1" },
        { offset: 1, valor: 197, estado: "activo", concepto: "Reactivación — mes 2" },
        { offset: 2, valor: 197, estado: "activo", concepto: "Reactivación — mes 3" },
      ];
    case "level_up":
      // Mes 1 $497. Del mes 2 en adelante el cliente elige soporte (cualquiera) o
      // se queda sin soporte; eso se registra manualmente, no se autogenera.
      return [
        { offset: 0, valor: 497, estado: "activo", concepto: "Level Up — mes 1" },
      ];
    default:
      return [];
  }
}

export interface ServicioRow {
  id: number;
  tipoServicio: TipoServicio;
  mesInicio: string;
  soporteValor: number | null;
  bono: number | null;
  nota: string | null;
}

/** Servicios registrados de un cliente (línea de tiempo). */
export async function serviciosDeCliente(clienteId: number): Promise<ServicioRow[]> {
  const rows = await consulta(
    `select id, tipo_servicio, mes_inicio, soporte_valor, bono_reactivacion, nota
       from public.cliente_servicios where cliente_id=$1 order by mes_inicio`,
    [clienteId],
  );
  return rows.map((r) => ({
    id: Number(r.id),
    tipoServicio: r.tipo_servicio as TipoServicio,
    mesInicio: (r.mes_inicio instanceof Date ? r.mes_inicio.toISOString() : String(r.mes_inicio)).slice(0, 10),
    soporteValor: r.soporte_valor == null ? null : Number(r.soporte_valor),
    bono: r.bono_reactivacion == null ? null : Number(r.bono_reactivacion),
    nota: (r.nota as string) ?? null,
  }));
}
