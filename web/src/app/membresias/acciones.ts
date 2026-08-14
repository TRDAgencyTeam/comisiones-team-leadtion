"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { consulta } from "@/lib/db";
import { getUsuario } from "@/lib/supabase/server";

/**
 * Crea un cliente en el maestro (tabla `clientes`). Al vivir en la misma tabla
 * que usa Customer Success, queda sincronizado con Comisiones CS de inmediato.
 * (La sincronización con Afiliados y las personas asignadas son sub-parte 2.)
 */
export async function crearMembresia(formData: FormData) {
  if (!(await getUsuario())) redirect("/login");

  const nombre = String(formData.get("nombre") ?? "").trim();
  const fechaActivacion = String(formData.get("fechaActivacion") ?? "").trim();
  const esAgencia = String(formData.get("esAgencia") ?? "") === "1";
  const planTipo = String(formData.get("planTipo") ?? "").trim() || null;
  const soporteRaw = String(formData.get("soporteValor") ?? "").trim();
  const soporteValor = soporteRaw === "" ? null : Number(soporteRaw);
  const apiEstado = String(formData.get("apiEstado") ?? "ninguna").trim();
  const apiValor = apiEstado === "vendida" ? 12 : apiEstado === "incluida" ? 10 : null;
  const bonoRaw = String(formData.get("bono") ?? "").trim();
  const bono = bonoRaw === "" ? null : Number(bonoRaw);
  const reserva = String(formData.get("reserva") ?? "") === "1";
  const fechaInicioReal = String(formData.get("fechaInicioReal") ?? "").trim() || null;
  const valorRaw = String(formData.get("valorLicencia") ?? "").trim();
  const valorLicencia = valorRaw === "" ? (esAgencia ? 0 : 69) : Number(valorRaw);

  if (!nombre || !fechaActivacion) {
    redirect("/membresias/nuevo?error=" + encodeURIComponent("Nombre y fecha de activación son obligatorios."));
  }

  const rows = await consulta(
    `insert into public.clientes
       (nombre, fecha_activacion, estado_actual, incluye_crm_en_marketing, plan_tipo,
        soporte_valor, valor_licencia_general, api_estado, api_valor,
        bono_reactivacion, reserva, fecha_inicio_real, creado_por_rol, estado_actualizado_en)
     values ($1,$2,'activo',$3,$4,$5,$6,$7,$8,$9,$10,$11,'admin',now())
     returning id`,
    [nombre, fechaActivacion, esAgencia, planTipo, soporteValor, valorLicencia,
     apiEstado, apiValor, bono, reserva, fechaInicioReal],
  );
  const id = rows[0]!.id;
  await consulta(
    `insert into public.cliente_estado_historial (cliente_id, estado, motivo)
     values ($1, 'activo', 'Alta desde Membresías')`,
    [id],
  );

  revalidatePath("/membresias");
  revalidatePath("/");
  redirect(`/membresias/${id}`);
}
