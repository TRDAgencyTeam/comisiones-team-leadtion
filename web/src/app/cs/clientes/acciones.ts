"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { consulta } from "@/lib/db";
import { fechaPago } from "@/lib/clientes";
import { soloAdmin } from "@/lib/sesion";

/** Crea un cliente nuevo para que el sistema lo tenga en cuenta en comisiones. */
export async function crearCliente(formData: FormData) {
  await soloAdmin();

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
    redirect("/cs/clientes/nuevo?error=" + encodeURIComponent("Nombre y fecha de activación son obligatorios."));
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

  revalidatePath("/cs/clientes");
  revalidatePath("/cs");
  redirect(`/cs/clientes/${id}`);
}

/**
 * Guarda cambios en el historial mensual: valor y estado por mes. Recibe inputs
 * con nombres `valor::YYYY-MM-01` y `estado::YYYY-MM-01`. Actualiza solo los
 * meses existentes del cliente.
 */
export async function guardarHistorial(formData: FormData) {
  await soloAdmin();

  const id = Number(formData.get("id"));
  const cambios = new Map<string, { valor: number | null; estado: string | null }>();

  for (const [key, val] of formData.entries()) {
    const v = String(val);
    if (key.startsWith("valor::")) {
      const mes = key.slice("valor::".length);
      const prev = cambios.get(mes) ?? { valor: null, estado: null };
      prev.valor = v.trim() === "" ? null : Number(v);
      cambios.set(mes, prev);
    } else if (key.startsWith("estado::")) {
      const mes = key.slice("estado::".length);
      const prev = cambios.get(mes) ?? { valor: null, estado: null };
      prev.estado = v;
      cambios.set(mes, prev);
    }
  }

  for (const [mes, { valor, estado }] of cambios) {
    if (!estado) continue;
    await consulta(
      `update public.pagos_mensuales
          set valor=$3, estado_mes=$4
        where cliente_id=$1 and mes=$2`,
      [id, mes, valor, estado],
    );
  }

  revalidatePath(`/cs/clientes/${id}`);
  revalidatePath("/cs/clientes");
  revalidatePath("/cs");
  redirect(`/cs/clientes/${id}`);
}

/** Actualiza los datos comerciales de un cliente (plan, soporte, marketing…). */
export async function actualizarCliente(formData: FormData) {
  await soloAdmin();

  const id = Number(formData.get("id"));
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
    redirect(`/cs/clientes/${id}/editar?error=` + encodeURIComponent("Nombre y fecha de activación son obligatorios."));
  }

  await consulta(
    `update public.clientes
        set nombre=$2, fecha_activacion=$3, plan_tipo=$4,
            valor_licencia_general=$5, soporte_valor=$6, incluye_crm_en_marketing=$7
      where id=$1`,
    [id, nombre, fechaActivacion, planTipo, valorLicencia, soporteValor, marketing],
  );

  // Un toque: si aún estamos dentro del día de pago del mes actual (hasta las
  // 23:59), sincroniza también el valor de ESE mes en el historial. Pasado ese
  // día, el mes se edita manualmente desde "Editar historial".
  if (valorLicencia !== null) {
    const hoy = new Date().toISOString().slice(0, 10);
    const mesActual = hoy.slice(0, 7) + "-01";
    const fp = fechaPago(fechaActivacion, mesActual);
    if (hoy <= fp) {
      await consulta(
        `update public.pagos_mensuales set valor=$3
          where cliente_id=$1 and mes=$2`,
        [id, mesActual, valorLicencia],
      );
    }
  }

  revalidatePath(`/cs/clientes/${id}`);
  revalidatePath("/cs/clientes");
  revalidatePath("/cs");
  redirect(`/cs/clientes/${id}`);
}

/**
 * Cambia el estado del cliente: cancelar, pausar/congelar o reactivar.
 * Registra el motivo y lo guarda en el historial para auditoría futura.
 */
export async function cambiarEstadoCliente(formData: FormData) {
  await soloAdmin();

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

  revalidatePath(`/cs/clientes/${id}`);
  revalidatePath("/cs/clientes");
  revalidatePath("/cs");
}
