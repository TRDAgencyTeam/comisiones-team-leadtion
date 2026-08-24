"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { consulta } from "@/lib/db";
import { soloAdmin } from "@/lib/sesion";

const n = (v: FormDataEntryValue | null): number => {
  const x = Number(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(x) ? x : 0;
};

/** Actualiza los datos del crédito (saldo, cuota, interés…). */
export async function actualizarCredito(formData: FormData) {
  await soloAdmin();
  const id = Number(formData.get("id"));
  const saldo = n(formData.get("saldo"));
  const cuota = n(formData.get("cuota"));
  const tasaEa = n(formData.get("tasaEa"));
  const interes = n(formData.get("interesCorriente"));
  await consulta(
    `update public.credito set saldo=$2, cuota=$3, tasa_ea=$4, interes_corriente=$5, actualizado_en=now() where id=$1`,
    [id, saldo, cuota, tasaEa, interes],
  );
  revalidatePath("/trd/gastos-fijos/credito");
  revalidatePath("/trd/gastos-fijos");
  redirect("/trd/gastos-fijos/credito");
}
