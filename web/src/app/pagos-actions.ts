"use server";

import { revalidatePath } from "next/cache";
import { consulta } from "@/lib/db";
import { soloAdmin } from "@/lib/sesion";
import { hitosDeColaborador, insertarPago, pagarCiclo } from "@/lib/comisiones-pago";

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
  revalidatePath("/membresias/dashboard");
}

/** Marca TODOS los hitos pendientes de un colaborador a este corte como pagados. */
export async function marcarCicloPagado(formData: FormData) {
  await soloAdmin();
  const colaboradorId = Number(formData.get("colaboradorId"));
  const corte = String(formData.get("corte"));

  await pagarCiclo(colaboradorId, corte);

  revalidatePath("/cs");
  revalidatePath("/cs/comisiones");
  revalidatePath("/membresias/dashboard");
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
  revalidatePath("/membresias/dashboard");
}
