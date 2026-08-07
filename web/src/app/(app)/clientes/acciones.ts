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
  const planTipoRaw = String(formData.get("planTipo") ?? "").trim();
  const planTipo = planTipoRaw === "" ? null : planTipoRaw;
  const valorRaw = String(formData.get("valorLicencia") ?? "").trim();
  const valorLicencia = valorRaw === "" ? null : Number(valorRaw);
  const soporteRaw = String(formData.get("soporteValor") ?? "").trim();
  const soporteValor = soporteRaw === "" ? null : Number(soporteRaw);
  const marketing = String(formData.get("marketing") ?? "") === "1";

  if (!nombre || !fechaActivacion) {
    redirect("/clientes/nuevo?error=" + encodeURIComponent("Nombre y fecha de activación son obligatorios."));
  }

  const rows = await consulta(
    `insert into public.clientes
       (nombre, plan_tipo, fecha_activacion, estado_actual, valor_licencia_general,
        soporte_valor, incluye_crm_en_marketing, creado_por_rol, estado_actualizado_en)
     values ($1, $2, $3, 'activo', $4, $5, $6, 'admin', now())
     returning id`,
    [nombre, planTipo, fechaActivacion, valorLicencia, soporteValor, marketing],
  );
  const id = rows[0]!.id;
  await consulta(
    `insert into public.cliente_estado_historial (cliente_id, estado, motivo)
     values ($1, 'activo', 'Alta del cliente')`,
    [id],
  );

  revalidatePath("/clientes");
  revalidatePath("/");
  redirect(`/clientes/${id}`);
}

/**
 * Cambia el estado del cliente: cancelar, pausar/congelar o reactivar.
 * Registra el motivo y lo guarda en el historial para auditoría futura.
 */
export async function cambiarEstadoCliente(formData: FormData) {
  if (!(await getUsuario())) redirect("/login");

  const id = Number(formData.get("id"));
  const accion = String(formData.get("accion")); // 'cancelar' | 'pausar' | 'reactivar'
  const motivo = String(formData.get("motivo") ?? "").trim() || null;

  const nuevoEstado =
    accion === "cancelar" ? "cancelado" : accion === "pausar" ? "pausado" : "activo";

  if (nuevoEstado === "cancelado") {
    const fecha = String(formData.get("fechaCancelacion") ?? "").trim() || null;
    await consulta(
      `update public.clientes
          set estado_actual='cancelado', fecha_cancelacion=$2,
              motivo_estado=$3, estado_actualizado_en=now()
        where id=$1`,
      [id, fecha, motivo],
    );
  } else if (nuevoEstado === "pausado") {
    await consulta(
      `update public.clientes
          set estado_actual='pausado', motivo_estado=$2, estado_actualizado_en=now()
        where id=$1`,
      [id, motivo],
    );
  } else {
    await consulta(
      `update public.clientes
          set estado_actual='activo', fecha_cancelacion=null,
              motivo_estado=$2, estado_actualizado_en=now()
        where id=$1`,
      [id, motivo],
    );
  }

  await consulta(
    `insert into public.cliente_estado_historial (cliente_id, estado, motivo)
     values ($1, $2, $3)`,
    [id, nuevoEstado, motivo],
  );

  revalidatePath(`/clientes/${id}`);
  revalidatePath("/clientes");
  revalidatePath("/");
}
