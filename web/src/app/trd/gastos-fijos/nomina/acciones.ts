"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addMonths } from "comisiones-cs-engine/dates";
import { consulta } from "@/lib/db";
import { soloAdmin } from "@/lib/sesion";

const n = (v: FormDataEntryValue | null): number => {
  const x = Number(String(v ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(x) ? x : 0;
};
const txt = (v: FormDataEntryValue | null): string | null => {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
};

/** Lee y normaliza los campos del formulario de nómina; calcula la fecha fin. */
function parse(formData: FormData) {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const area = txt(formData.get("area"));
  const email = (txt(formData.get("email")) ?? "")?.toLowerCase() || null;
  const identificacion = txt(formData.get("identificacion"));
  const fechaNacimiento = txt(formData.get("fechaNacimiento"));
  const fechaInicio = txt(formData.get("fechaInicio"));
  const duracionRaw = txt(formData.get("duracionMeses"));
  const duracionMeses = duracionRaw ? Math.round(Number(duracionRaw)) : null;
  const valorNomina = n(formData.get("valorNomina"));

  // Fecha fin = inicio + duración (en meses). Se calcula sola.
  let fechaFin: string | null = null;
  if (fechaInicio && duracionMeses && duracionMeses > 0) {
    fechaFin = addMonths(fechaInicio, duracionMeses);
  }
  return { nombre, area, email, identificacion, fechaNacimiento, fechaInicio, duracionMeses, fechaFin, valorNomina };
}

/** Crea una persona de nómina (categoría vacía → NO comisiona en CS). */
export async function crearPersona(formData: FormData) {
  await soloAdmin();
  const d = parse(formData);
  if (!d.nombre) {
    redirect("/trd/gastos-fijos/nomina/nuevo?error=" + encodeURIComponent("El nombre es obligatorio."));
  }
  await consulta(
    `insert into public.colaboradores
       (nombre, rol, categoria, activo, area, email, identificacion,
        fecha_nacimiento, fecha_ingreso, fecha_inicio_contrato, duracion_contrato_meses,
        fecha_fin_contrato, valor_nomina)
     values ($1,'cs',null,true,$2,$3,$4,$5,$6,$6,$7,$8,$9)`,
    [d.nombre, d.area, d.email, d.identificacion, d.fechaNacimiento, d.fechaInicio,
     d.duracionMeses, d.fechaFin, d.valorNomina],
  );
  revalidatePath("/trd/gastos-fijos/nomina");
  redirect("/trd/gastos-fijos/nomina");
}

/** Actualiza los datos de una persona de nómina. */
export async function actualizarPersona(formData: FormData) {
  await soloAdmin();
  const id = Number(formData.get("id"));
  const d = parse(formData);
  if (!d.nombre) {
    redirect(`/trd/gastos-fijos/nomina/${id}?error=` + encodeURIComponent("El nombre es obligatorio."));
  }
  await consulta(
    `update public.colaboradores
        set nombre=$2, area=$3, email=$4, identificacion=$5, fecha_nacimiento=$6,
            fecha_inicio_contrato=$7, duracion_contrato_meses=$8, fecha_fin_contrato=$9,
            valor_nomina=$10
      where id=$1`,
    [id, d.nombre, d.area, d.email, d.identificacion, d.fechaNacimiento,
     d.fechaInicio, d.duracionMeses, d.fechaFin, d.valorNomina],
  );
  revalidatePath("/trd/gastos-fijos/nomina");
  revalidatePath(`/trd/gastos-fijos/nomina/${id}`);
  redirect("/trd/gastos-fijos/nomina");
}

/** Activa/desactiva una persona (inactiva = no aparece en REG). */
export async function cambiarEstadoPersona(formData: FormData) {
  await soloAdmin();
  const id = Number(formData.get("id"));
  const activar = String(formData.get("activar")) === "1";
  await consulta(`update public.colaboradores set activo=$2 where id=$1`, [id, activar]);
  revalidatePath("/trd/gastos-fijos/nomina");
}
