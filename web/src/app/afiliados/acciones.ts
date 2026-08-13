"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { consulta } from "@/lib/db";
import { getUsuario } from "@/lib/supabase/server";

/** Marca como pagada una comisión (cliente + mes) del módulo afiliados. */
export async function marcarPagadoAfiliado(formData: FormData) {
  if (!(await getUsuario())) redirect("/login");
  const clienteRef = String(formData.get("clienteRef"));
  const mesNum = Number(formData.get("mesNum"));
  const monto = Number(formData.get("monto"));
  const hoy = new Date().toISOString().slice(0, 10);

  // Evitar duplicados: solo insertar si no existe pago para (cliente, mes).
  const existe = await consulta(
    `select 1 from public.pagos_afiliados where cliente_ref=$1 and mes_num=$2 limit 1`,
    [clienteRef, mesNum],
  );
  if (existe.length === 0) {
    await consulta(
      `insert into public.pagos_afiliados (ref, cliente_ref, mes_num, fecha_pago, monto)
       values ($1,$2,$3,$4,$5)`,
      [`pago-${clienteRef}-${mesNum}-${Date.now()}`, clienteRef, mesNum, hoy, monto],
    );
  }
  revalidatePath("/afiliados");
  revalidatePath("/afiliados/comisiones");
}

/** Deshace el pago de una comisión (cliente + mes). */
export async function deshacerPagoAfiliado(formData: FormData) {
  if (!(await getUsuario())) redirect("/login");
  const clienteRef = String(formData.get("clienteRef"));
  const mesNum = Number(formData.get("mesNum"));
  await consulta(
    `delete from public.pagos_afiliados where cliente_ref=$1 and mes_num=$2`,
    [clienteRef, mesNum],
  );
  revalidatePath("/afiliados");
  revalidatePath("/afiliados/comisiones");
}
