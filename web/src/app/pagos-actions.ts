"use server";

import { revalidatePath } from "next/cache";
import { calcularComision } from "comisiones-cs-engine/rules";
import type { HitoDetalle } from "comisiones-cs-engine/types";
import { consulta, fuente } from "@/lib/db";
import { soloAdmin } from "@/lib/sesion";

/** Recalcula los hitos alcanzados por un colaborador a un corte (fuente de verdad). */
async function hitosDeColaborador(colaboradorId: number, corte: string) {
  const [clientes, colaboradores] = await Promise.all([
    fuente.cargarClientes(),
    fuente.cargarColaboradores(),
  ]);
  const colaborador = colaboradores.find((c) => c.id === colaboradorId);
  if (!colaborador) return { colaborador: null, lineas: [] as const };
  const r = calcularComision(colaborador, clientes, corte);
  return { colaborador, lineas: r.lineas };
}

/** Inserta un hito liquidado (idempotente por la UNIQUE de la tabla). */
async function insertarPago(
  colaboradorId: number,
  clienteId: number,
  h: HitoDetalle,
  corte: string,
) {
  await consulta(
    `insert into public.comision_hitos
       (colaborador_id, cliente_id, hito, base, tasa, meses_base, monto, fecha_corte)
     values ($1,$2,$3,$4,$5,$6,$7,$8)
     on conflict (colaborador_id, cliente_id, hito) do nothing`,
    [colaboradorId, clienteId, h.hito, h.base, h.tasa, h.mesesBase, h.monto, corte],
  );
}

/** Marca un hito concreto (cliente + T1/T2/T3) como pagado a un colaborador. */
export async function marcarHitoPagado(formData: FormData) {
  await soloAdmin();

  const colaboradorId = Number(formData.get("colaboradorId"));
  const clienteId = Number(formData.get("clienteId"));
  const hito = String(formData.get("hito"));
  const corte = String(formData.get("corte"));

  const { lineas } = await hitosDeColaborador(colaboradorId, corte);
  const linea = lineas.find((l) => l.clienteId === clienteId);
  const detalle = linea?.hitos.find((h) => h.hito === hito);
  if (detalle) await insertarPago(colaboradorId, clienteId, detalle, corte);

  revalidatePath("/cs");
  revalidatePath("/cs/comisiones");
}

/** Marca TODOS los hitos pendientes de un colaborador a este corte como pagados. */
export async function marcarCicloPagado(formData: FormData) {
  await soloAdmin();

  const colaboradorId = Number(formData.get("colaboradorId"));
  const corte = String(formData.get("corte"));

  const { lineas } = await hitosDeColaborador(colaboradorId, corte);
  for (const l of lineas) {
    for (const h of l.hitos) {
      await insertarPago(colaboradorId, l.clienteId, h, corte);
    }
  }

  revalidatePath("/cs");
  revalidatePath("/cs/comisiones");
}

/** Deshace el registro de pago de un hito (por si se marcó por error). */
export async function deshacerHitoPagado(formData: FormData) {
  await soloAdmin();

  const colaboradorId = Number(formData.get("colaboradorId"));
  const clienteId = Number(formData.get("clienteId"));
  const hito = String(formData.get("hito"));

  await consulta(
    `delete from public.comision_hitos
      where colaborador_id=$1 and cliente_id=$2 and hito=$3`,
    [colaboradorId, clienteId, hito],
  );

  revalidatePath("/cs");
  revalidatePath("/cs/comisiones");
}
