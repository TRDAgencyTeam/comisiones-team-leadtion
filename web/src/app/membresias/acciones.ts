"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { consulta } from "@/lib/db";
import { getUsuario } from "@/lib/supabase/server";

/** Mapea la opción de API del formulario a (estado, valor). */
function parseApi(op: string): { estado: string; valor: number | null } {
  if (op === "incluida") return { estado: "incluida", valor: 10 };
  if (op === "vendida_12") return { estado: "vendida", valor: 12 };
  if (op === "vendida_10") return { estado: "vendida", valor: 10 };
  return { estado: "ninguna", valor: null };
}

/** Edita un cliente del maestro (plan, soporte, API, estado, agencia, etc.). */
export async function actualizarMembresia(formData: FormData) {
  if (!(await getUsuario())) redirect("/login");
  const id = Number(formData.get("id"));
  const nombre = String(formData.get("nombre") ?? "").trim();
  const estado = String(formData.get("estado") ?? "activo");
  const esAgencia = String(formData.get("esAgencia") ?? "") === "1";
  const planTipo = String(formData.get("planTipo") ?? "").trim() || null;
  const soporteRaw = String(formData.get("soporteValor") ?? "").trim();
  const soporteValor = soporteRaw === "" ? null : Number(soporteRaw);
  const api = parseApi(String(formData.get("apiOpcion") ?? "ninguna"));
  const bonoRaw = String(formData.get("bono") ?? "").trim();
  const bono = bonoRaw === "" ? null : Number(bonoRaw);
  const valorRaw = String(formData.get("valorLicencia") ?? "").trim();
  const valorLicencia = valorRaw === "" ? null : Number(valorRaw);

  if (!nombre) redirect(`/membresias/${id}/editar?error=` + encodeURIComponent("El nombre es obligatorio."));

  await consulta(
    `update public.clientes
        set nombre=$2, estado_actual=$3, incluye_crm_en_marketing=$4, plan_tipo=$5,
            soporte_valor=$6, valor_licencia_general=$7, api_estado=$8, api_valor=$9,
            bono_reactivacion=$10, estado_actualizado_en=now()
      where id=$1`,
    [id, nombre, estado, esAgencia, planTipo, soporteValor, valorLicencia, api.estado, api.valor, bono],
  );
  revalidatePath(`/membresias/${id}`);
  revalidatePath("/membresias");
  revalidatePath("/membresias/dashboard");
  revalidatePath("/");
  redirect(`/membresias/${id}`);
}

/** Reporta la ganancia de reselling del mes actual. */
export async function guardarReselling(formData: FormData) {
  if (!(await getUsuario())) redirect("/login");
  const mes = String(formData.get("mes") ?? "").trim();
  const monto = Number(formData.get("monto") || 0);
  if (mes) {
    await consulta(
      `insert into public.reselling_mensual (mes, monto) values ($1,$2)
       on conflict (mes) do update set monto = excluded.monto`,
      [mes, monto],
    );
  }
  revalidatePath("/membresias/dashboard");
}

const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const mesTexto = (iso: string) => { const [y, m] = iso.split("-").map(Number); return `${MESES[(m ?? 1) - 1]} ${y}`; };

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

  // Personas asignadas (colaboradores CS) -> a quién se le paga comisión.
  const asignados = formData.getAll("asignados").map((v) => Number(v)).filter(Boolean);
  for (const colId of asignados) {
    await consulta(
      `insert into public.cliente_colaboradores (cliente_id, colaborador_id)
       values ($1,$2) on conflict do nothing`,
      [id, colId],
    );
  }

  // Si vino recomendado por un afiliado -> sincronizar con módulo Afiliados.
  const afiliadoRef = String(formData.get("afiliadoRef") ?? "").trim();
  if (afiliadoRef) {
    await consulta(
      `insert into public.clientes_afiliados (ref, nombre, afiliado_ref, fecha_inicio, precio_licencia)
       values ($1,$2,$3,$4,$5) on conflict (ref) do nothing`,
      [`cl-mem-${id}`, nombre, afiliadoRef, mesTexto(fechaActivacion), valorLicencia || 69],
    );
  }

  revalidatePath("/membresias");
  revalidatePath("/");
  revalidatePath("/afiliados");
  redirect(`/membresias/${id}`);
}
