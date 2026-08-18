"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addMonths } from "comisiones-cs-engine/dates";
import { consulta } from "@/lib/db";
import { soloAdmin } from "@/lib/sesion";

/** Normaliza los campos del formulario y calcula la fecha de fin de prueba. */
function parseForm(formData: FormData) {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const rol = String(formData.get("rol") ?? "cs");
  const categoriaRaw = String(formData.get("categoria") ?? "").trim();
  const categoria = categoriaRaw === "" ? null : categoriaRaw;
  const fechaIngreso = String(formData.get("fechaIngreso") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim().toLowerCase() || null;

  // Un "nuevo" tiene 3 meses de prueba desde su ingreso; fundador no tiene.
  let finPrueba: string | null = null;
  if (categoria === "nuevo" && fechaIngreso) {
    finPrueba = addMonths(fechaIngreso, 3);
  }
  return { nombre, rol, categoria, fechaIngreso, finPrueba, email };
}

/** Crea un colaborador nuevo. */
export async function crearColaborador(formData: FormData) {
  await soloAdmin();
  const { nombre, rol, categoria, fechaIngreso, finPrueba, email } = parseForm(formData);

  if (!nombre) {
    redirect("/cs/colaboradores/nuevo?error=" + encodeURIComponent("El nombre es obligatorio."));
  }

  await consulta(
    `insert into public.colaboradores
       (nombre, rol, categoria, fecha_ingreso, fecha_fin_prueba, activo, email)
     values ($1, $2, $3, $4, $5, true, $6)`,
    [nombre, rol, categoria, fechaIngreso, finPrueba, email],
  );

  revalidatePath("/cs/colaboradores");
  revalidatePath("/cs");
  redirect("/cs/colaboradores");
}

/** Actualiza los datos de un colaborador. */
export async function actualizarColaborador(formData: FormData) {
  await soloAdmin();
  const id = Number(formData.get("id"));
  const { nombre, rol, categoria, fechaIngreso, finPrueba, email } = parseForm(formData);

  if (!nombre) {
    redirect(`/cs/colaboradores/${id}?error=` + encodeURIComponent("El nombre es obligatorio."));
  }

  await consulta(
    `update public.colaboradores
        set nombre=$2, rol=$3, categoria=$4, fecha_ingreso=$5, fecha_fin_prueba=$6, email=$7
      where id=$1`,
    [id, nombre, rol, categoria, fechaIngreso, finPrueba, email],
  );

  revalidatePath(`/cs/colaboradores/${id}`);
  revalidatePath("/cs/colaboradores");
  revalidatePath("/cs");
  redirect("/cs/colaboradores");
}

/** Activa o desactiva un colaborador. */
export async function cambiarEstadoColaborador(formData: FormData) {
  await soloAdmin();
  const id = Number(formData.get("id"));
  const activar = String(formData.get("activar")) === "1";

  await consulta(`update public.colaboradores set activo=$2 where id=$1`, [id, activar]);

  revalidatePath(`/cs/colaboradores/${id}`);
  revalidatePath("/cs/colaboradores");
  revalidatePath("/cs");
}
