"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { consulta } from "@/lib/db";
import { soloAdmin } from "@/lib/sesion";

const n = (v: FormDataEntryValue | null): number => {
  const x = Number(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(x) ? x : 0;
};
const txt = (v: FormDataEntryValue | null): string | null => {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
};

function parse(formData: FormData) {
  const categoria = String(formData.get("categoria") ?? "otro");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const moneda = String(formData.get("moneda") ?? "COP") === "USD" ? "USD" : "COP";
  const valor = n(formData.get("valor"));
  const recurrencia = String(formData.get("recurrencia") ?? "mensual");
  const diaCobroRaw = txt(formData.get("diaCobro"));
  const diaCobro = diaCobroRaw ? Math.round(Number(diaCobroRaw)) : null;
  const metodoPago = txt(formData.get("metodoPago"));
  const reparto = formData.get("porcentajeReparto") != null && String(formData.get("porcentajeReparto")).trim() !== ""
    ? Number(String(formData.get("porcentajeReparto")).replace(/[^\d.]/g, "")) : 100;
  const amortizar = String(formData.get("amortizar")) === "1";
  const afectaUtilidad = categoria === "paso_dinero" ? false : formData.get("afectaUtilidad") === "1";
  const notas = txt(formData.get("notas"));
  return { categoria, nombre, moneda, valor, recurrencia, diaCobro, metodoPago, reparto, amortizar, afectaUtilidad, notas };
}

export async function crearGasto(formData: FormData) {
  await soloAdmin();
  const d = parse(formData);
  if (!d.nombre) redirect("/trd/gastos-fijos/gastos/nuevo?error=" + encodeURIComponent("El nombre es obligatorio."));
  await consulta(
    `insert into public.gasto_fijo
       (categoria, nombre, moneda, valor, recurrencia, dia_cobro, metodo_pago,
        porcentaje_reparto, amortizar, afecta_utilidad, notas)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [d.categoria, d.nombre, d.moneda, d.valor, d.recurrencia, d.diaCobro, d.metodoPago,
     d.reparto, d.amortizar, d.afectaUtilidad, d.notas],
  );
  revalidatePath("/trd/gastos-fijos/gastos");
  revalidatePath("/trd/gastos-fijos");
  redirect("/trd/gastos-fijos/gastos");
}

export async function actualizarGasto(formData: FormData) {
  await soloAdmin();
  const id = Number(formData.get("id"));
  const d = parse(formData);
  if (!d.nombre) redirect(`/trd/gastos-fijos/gastos/${id}?error=` + encodeURIComponent("El nombre es obligatorio."));
  await consulta(
    `update public.gasto_fijo
        set categoria=$2, nombre=$3, moneda=$4, valor=$5, recurrencia=$6, dia_cobro=$7,
            metodo_pago=$8, porcentaje_reparto=$9, amortizar=$10, afecta_utilidad=$11, notas=$12
      where id=$1`,
    [id, d.categoria, d.nombre, d.moneda, d.valor, d.recurrencia, d.diaCobro, d.metodoPago,
     d.reparto, d.amortizar, d.afectaUtilidad, d.notas],
  );
  revalidatePath("/trd/gastos-fijos/gastos");
  revalidatePath("/trd/gastos-fijos");
  redirect("/trd/gastos-fijos/gastos");
}

export async function eliminarGasto(formData: FormData) {
  await soloAdmin();
  const id = Number(formData.get("id"));
  await consulta(`delete from public.gasto_fijo where id=$1`, [id]);
  revalidatePath("/trd/gastos-fijos/gastos");
  revalidatePath("/trd/gastos-fijos");
}
