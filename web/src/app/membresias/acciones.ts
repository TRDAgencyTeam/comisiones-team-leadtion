"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { consulta } from "@/lib/db";
import { getUsuario } from "@/lib/supabase/server";
import { calendarioServicio, type TipoServicio } from "@/lib/servicios";

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
  const tipoRaw = String(formData.get("tipoCliente") ?? "estandar").trim();
  const tipoCliente = ["estandar", "agencia", "servicio"].includes(tipoRaw) ? tipoRaw : "estandar";
  const esAgencia = tipoCliente === "agencia";
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
            bono_reactivacion=$10, tipo_cliente=$11, estado_actualizado_en=now()
      where id=$1`,
    [id, nombre, estado, esAgencia, planTipo, soporteValor, valorLicencia, api.estado, api.valor, bono, tipoCliente],
  );
  revalidatePath(`/membresias/${id}`);
  revalidatePath("/membresias/clientes");
  revalidatePath("/membresias/dashboard");
  revalidatePath("/cs");
  redirect(`/membresias/${id}`);
}

/** Suma `n` meses a un "YYYY-MM" y devuelve el primer día como "YYYY-MM-01". */
function mesConDesfase(mesInicio: string, n: number): string {
  const [y, m] = mesInicio.split("-").map(Number);
  const d = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

/**
 * Registra un servicio especial que el cliente adquirió en un mes dado y genera
 * los cobros de su ventana (mes 1/2/3) según la dinámica del servicio, sin tocar
 * el historial anterior del cliente. Sobrescribe solo los meses de la ventana.
 */
export async function registrarServicio(formData: FormData) {
  if (!(await getUsuario())) redirect("/login");
  const clienteId = Number(formData.get("clienteId"));
  const tipoRaw = String(formData.get("tipoServicio") ?? "").trim();
  const tipos: TipoServicio[] = ["agente_ai", "reactivacion", "level_up"];
  const tipoServicio = tipos.includes(tipoRaw as TipoServicio) ? (tipoRaw as TipoServicio) : null;
  const mesInicio = String(formData.get("mesInicio") ?? "").trim(); // "YYYY-MM"
  const soporteRaw = String(formData.get("soporteValor") ?? "").trim();
  const soporteValor = soporteRaw === "" ? null : Number(soporteRaw);
  const bonoRaw = String(formData.get("bono") ?? "").trim();
  const bono = bonoRaw === "" ? null : Number(bonoRaw);
  const nota = String(formData.get("nota") ?? "").trim() || null;

  const base = `/membresias/${clienteId}/servicio`;
  if (!clienteId || !tipoServicio || !/^\d{4}-\d{2}$/.test(mesInicio)) {
    redirect(`${base}?error=` + encodeURIComponent("Servicio y mes de inicio son obligatorios."));
  }

  await consulta(
    `insert into public.cliente_servicios (cliente_id, tipo_servicio, mes_inicio, soporte_valor, bono_reactivacion, nota)
     values ($1,$2,$3,$4,$5,$6)`,
    [clienteId, tipoServicio, `${mesInicio}-01`, soporteValor, bono, nota],
  );

  // Genera/sobrescribe los pagos de la ventana del servicio.
  for (const m of calendarioServicio(tipoServicio!, soporteValor)) {
    const mes = mesConDesfase(mesInicio, m.offset);
    await consulta(
      `insert into public.pagos_mensuales (cliente_id, mes, valor, estado_mes)
       values ($1,$2,$3,$4)
       on conflict (cliente_id, mes) do update set valor=excluded.valor, estado_mes=excluded.estado_mes`,
      [clienteId, mes, m.valor, m.estado],
    );
  }

  // Refleja el servicio actual en la ficha (sin cambiar el tipo de cliente).
  await consulta(
    `update public.clientes set plan_tipo=$2, soporte_valor=coalesce($3, soporte_valor),
        bono_reactivacion=coalesce($4, bono_reactivacion), estado_actualizado_en=now()
      where id=$1`,
    [clienteId, tipoServicio, soporteValor, bono],
  );

  revalidatePath(`/membresias/${clienteId}`);
  revalidatePath("/membresias/clientes");
  revalidatePath("/membresias/dashboard");
  revalidatePath("/cs");
  redirect(`/membresias/${clienteId}`);
}

/**
 * Elimina por completo un cliente ingresado por error. Las tablas hijas
 * (pagos, hitos, evaluaciones, servicios, personas asignadas, historial) se
 * borran en cascada; el vínculo con Afiliados se borra manualmente.
 * Acción IRREVERSIBLE.
 */
export async function eliminarMembresia(formData: FormData) {
  if (!(await getUsuario())) redirect("/login");
  const id = Number(formData.get("id"));
  if (!id) redirect("/membresias/clientes");

  await consulta(`delete from public.clientes_afiliados where ref = $1`, [`cl-mem-${id}`]);
  await consulta(`delete from public.clientes where id = $1`, [id]);

  revalidatePath("/membresias/clientes");
  revalidatePath("/membresias/dashboard");
  revalidatePath("/cs");
  revalidatePath("/afiliados");
  redirect("/membresias/clientes");
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
  const tipoRaw = String(formData.get("tipoCliente") ?? "estandar").trim();
  const tipoCliente = ["estandar", "agencia", "servicio"].includes(tipoRaw) ? tipoRaw : "estandar";
  const esAgencia = tipoCliente === "agencia";
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
        bono_reactivacion, reserva, fecha_inicio_real, tipo_cliente, creado_por_rol, estado_actualizado_en)
     values ($1,$2,'activo',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'admin',now())
     returning id`,
    [nombre, fechaActivacion, esAgencia, planTipo, soporteValor, valorLicencia,
     apiEstado, apiValor, bono, reserva, fechaInicioReal, tipoCliente],
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

  revalidatePath("/membresias/clientes");
  revalidatePath("/cs");
  revalidatePath("/afiliados");
  redirect(`/membresias/${id}`);
}
