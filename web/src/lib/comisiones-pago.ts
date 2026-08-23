import "server-only";
import { calcularComision } from "comisiones-cs-engine/rules";
import type { HitoDetalle } from "comisiones-cs-engine/types";
import { consulta, fuente } from "@/lib/db";

/**
 * Núcleo del REGISTRO de pago de comisiones (tabla comision_hitos), reutilizable
 * desde el módulo CS y desde Registro contable (REG). El pago se dispara al
 * marcar "Pagado" en REG (una sola empresa paga todo).
 */

/** Recalcula los hitos alcanzados por un colaborador a un corte (fuente de verdad). */
export async function hitosDeColaborador(colaboradorId: number, corte: string) {
  const [clientes, colaboradores] = await Promise.all([
    fuente.cargarClientes(),
    fuente.cargarColaboradores(),
  ]);
  const colaborador = colaboradores.find((c) => c.id === colaboradorId);
  if (!colaborador) return { colaborador: null, lineas: [] as ReturnType<typeof calcularComision>["lineas"] };
  const r = calcularComision(colaborador, clientes, corte);
  return { colaborador, lineas: r.lineas };
}

/** Inserta un hito liquidado (idempotente por la UNIQUE de la tabla). */
export async function insertarPago(colaboradorId: number, clienteId: number, h: HitoDetalle, corte: string) {
  await consulta(
    `insert into public.comision_hitos
       (colaborador_id, cliente_id, hito, base, tasa, meses_base, monto, fecha_corte)
     values ($1,$2,$3,$4,$5,$6,$7,$8)
     on conflict (colaborador_id, cliente_id, hito) do nothing`,
    [colaboradorId, clienteId, h.hito, h.base, h.tasa, h.mesesBase, h.monto, corte],
  );
}

/** Registra como pagados TODOS los hitos pendientes de un colaborador a un corte. */
export async function pagarCiclo(colaboradorId: number, corte: string) {
  const { lineas } = await hitosDeColaborador(colaboradorId, corte);
  for (const l of lineas) {
    for (const h of l.hitos) {
      await insertarPago(colaboradorId, l.clienteId, h, corte);
    }
  }
}

/** Deshace lo que se registró en ESE corte para el colaborador (al desmarcar pago). */
export async function deshacerCiclo(colaboradorId: number, corte: string) {
  await consulta(
    `delete from public.comision_hitos where colaborador_id = $1 and fecha_corte = $2`,
    [colaboradorId, corte],
  );
}
