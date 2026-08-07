"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { consulta } from "@/lib/db";
import { getUsuario } from "@/lib/supabase/server";

/** Crea un cliente nuevo para que el sistema lo tenga en cuenta en comisiones. */
export async function crearCliente(formData: FormData) {
  if (!(await getUsuario())) redirect("/login");

  const nombre = String(formData.get("nombre") ?? "").trim();
  const fechaActivacion = String(formData.get("fechaActivacion") ?? "").trim();
  const plan = String(formData.get("plan") ?? "").trim() || null;
  const valorRaw = String(formData.get("valorLicencia") ?? "").trim();
  const valorLicencia = valorRaw === "" ? null : Number(valorRaw);

  if (!nombre || !fechaActivacion) {
    redirect("/clientes/nuevo?error=" + encodeURIComponent("Nombre y fecha de activación son obligatorios."));
  }

  const rows = await consulta(
    `insert into public.clientes
       (nombre, plan, fecha_activacion, estado_actual, valor_licencia_general, creado_por_rol)
     values ($1, $2, $3, 'activo', $4, 'admin')
     returning id`,
    [nombre, plan, fechaActivacion, valorLicencia],
  );

  revalidatePath("/clientes");
  revalidatePath("/");
  redirect(`/clientes/${rows[0]!.id}`);
}

/** Activa o desactiva (cancela) un cliente. Al cancelar, registra la fecha. */
export async function cambiarEstadoCliente(formData: FormData) {
  if (!(await getUsuario())) redirect("/login");

  const id = Number(formData.get("id"));
  const accion = String(formData.get("accion")); // 'cancelar' | 'reactivar'

  if (accion === "cancelar") {
    const fecha = String(formData.get("fechaCancelacion") ?? "").trim();
    await consulta(
      `update public.clientes
          set estado_actual = 'cancelado',
              fecha_cancelacion = $2
        where id = $1`,
      [id, fecha || null],
    );
  } else {
    await consulta(
      `update public.clientes
          set estado_actual = 'activo', fecha_cancelacion = null
        where id = $1`,
      [id],
    );
  }

  revalidatePath(`/clientes/${id}`);
  revalidatePath("/clientes");
  revalidatePath("/");
}
