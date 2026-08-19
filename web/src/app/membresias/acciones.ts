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
 * Recalcula los pagos de TODOS los meses cubiertos por servicios del cliente,
 * SUMANDO los cobros cuando dos servicios caen en el mismo mes. Se ejecuta tras
 * insertar servicios: así, aunque un cliente tenga varios servicios (a la vez o
 * en momentos distintos), cada mes refleja la suma correcta.
 */
async function recomputarPagosDeServicios(clienteId: number) {
  // Limpia los meses de servicios anteriores (así, si un servicio cambia de mes,
  // los meses que dejó de ocupar se borran). Los meses manuales/licencia no se tocan.
  await consulta(`delete from public.pagos_mensuales where cliente_id=$1 and origen='servicio'`, [clienteId]);

  const servicios = await consulta(
    `select tipo_servicio, mes_inicio, soporte_valor, precio_mes1
       from public.cliente_servicios where cliente_id=$1`,
    [clienteId],
  );
  const porMes = new Map<string, number>();
  for (const s of servicios) {
    const mesInicio = (s.mes_inicio instanceof Date ? s.mes_inicio.toISOString() : String(s.mes_inicio)).slice(0, 7);
    const cal = calendarioServicio(
      s.tipo_servicio as TipoServicio,
      s.soporte_valor == null ? null : Number(s.soporte_valor),
      s.precio_mes1 == null ? null : Number(s.precio_mes1),
    );
    for (const m of cal) {
      const mes = mesConDesfase(mesInicio, m.offset);
      porMes.set(mes, (porMes.get(mes) ?? 0) + m.valor);
    }
  }
  for (const [mes, valor] of porMes) {
    const estado = valor > 0 ? "activo" : "garantia";
    await consulta(
      `insert into public.pagos_mensuales (cliente_id, mes, valor, estado_mes, origen)
       values ($1,$2,$3,$4,'servicio')
       on conflict (cliente_id, mes) do update set valor=excluded.valor, estado_mes=excluded.estado_mes, origen='servicio'`,
      [clienteId, mes, valor, estado],
    );
  }
}

/**
 * Registra UNO O VARIOS servicios que el cliente adquirió (Agente IA / Reactivación
 * / Level Up), cada uno con su mes de compra y, opcionalmente, un precio de mes 1
 * negociado. Genera los cobros de sus ventanas SUMANDO cuando coinciden en el mes,
 * sin tocar el historial anterior.
 */
export async function registrarServicio(formData: FormData) {
  if (!(await getUsuario())) redirect("/login");
  const clienteId = Number(formData.get("clienteId"));
  const base = `/membresias/${clienteId}/servicio`;

  const tipos = formData.getAll("tipoServicio").map((v) => String(v).trim());
  const meses = formData.getAll("mesInicio").map((v) => String(v).trim());
  const precios = formData.getAll("precioMes1").map((v) => String(v).trim());
  const soportes = formData.getAll("soporteValor").map((v) => String(v).trim());
  const bonos = formData.getAll("bono").map((v) => String(v).trim());
  const notas = formData.getAll("nota").map((v) => String(v).trim());

  const validos: TipoServicio[] = ["agente_ai", "reactivacion", "level_up"];
  let insertados = 0;
  let ultimoTipo: string | null = null;
  let ultimoSoporte: number | null = null;
  let ultimoBono: number | null = null;

  for (let i = 0; i < tipos.length; i++) {
    const tipo = tipos[i];
    const mes = meses[i] ?? "";
    if (!validos.includes(tipo as TipoServicio) || !/^\d{4}-\d{2}$/.test(mes)) continue; // fila incompleta: se ignora
    const precioMes1 = precios[i] && precios[i] !== "" ? Number(precios[i]) : null;
    const soporteValor = soportes[i] && soportes[i] !== "" ? Number(soportes[i]) : null;
    const bono = bonos[i] && bonos[i] !== "" ? Number(bonos[i]) : null;
    const nota = notas[i] && notas[i] !== "" ? notas[i]! : null;

    await consulta(
      `insert into public.cliente_servicios
         (cliente_id, tipo_servicio, mes_inicio, soporte_valor, precio_mes1, bono_reactivacion, nota)
       values ($1,$2,$3,$4,$5,$6,$7)`,
      [clienteId, tipo, `${mes}-01`, soporteValor, precioMes1, bono, nota],
    );
    insertados++;
    ultimoTipo = tipo;
    if (soporteValor != null) ultimoSoporte = soporteValor;
    if (bono != null) ultimoBono = bono;
  }

  if (!clienteId || insertados === 0) {
    redirect(`${base}?error=` + encodeURIComponent("Agrega al menos un servicio con su mes de compra."));
  }

  // Recalcula los pagos (suma los servicios que coincidan en un mismo mes).
  await recomputarPagosDeServicios(clienteId);

  // Refleja en la ficha el último servicio registrado (la lista completa se ve
  // en "Servicios adquiridos"). No cambia el tipo de cliente.
  await consulta(
    `update public.clientes set plan_tipo=$2, soporte_valor=coalesce($3, soporte_valor),
        bono_reactivacion=coalesce($4, bono_reactivacion), estado_actualizado_en=now()
      where id=$1`,
    [clienteId, ultimoTipo, ultimoSoporte, ultimoBono],
  );

  revalidatePath(`/membresias/${clienteId}`);
  revalidatePath("/membresias/clientes");
  revalidatePath("/membresias/dashboard");
  revalidatePath("/cs");
  redirect(`/membresias/${clienteId}`);
}

function revalidarServicio(clienteId: number) {
  revalidatePath(`/membresias/${clienteId}`);
  revalidatePath("/membresias/clientes");
  revalidatePath("/membresias/dashboard");
  revalidatePath("/cs");
}

/** Edita un servicio adquirido (corrige mes, precio, soporte…) y recalcula el historial. */
export async function editarServicio(formData: FormData) {
  if (!(await getUsuario())) redirect("/login");
  const servicioId = Number(formData.get("servicioId"));
  const clienteId = Number(formData.get("clienteId"));
  const base = `/membresias/${clienteId}/servicio/${servicioId}/editar`;

  const tipoRaw = String(formData.get("tipoServicio") ?? "").trim();
  const validos: TipoServicio[] = ["agente_ai", "reactivacion", "level_up"];
  const tipo = validos.includes(tipoRaw as TipoServicio) ? (tipoRaw as TipoServicio) : null;
  const mes = String(formData.get("mesInicio") ?? "").trim();
  if (!servicioId || !clienteId || !tipo || !/^\d{4}-\d{2}$/.test(mes)) {
    redirect(`${base}?error=` + encodeURIComponent("Servicio y mes de compra son obligatorios."));
  }
  const precioMes1 = (formData.get("precioMes1") ?? "") !== "" ? Number(formData.get("precioMes1")) : null;
  const soporteValor = (formData.get("soporteValor") ?? "") !== "" ? Number(formData.get("soporteValor")) : null;
  const bono = (formData.get("bono") ?? "") !== "" ? Number(formData.get("bono")) : null;
  const nota = String(formData.get("nota") ?? "").trim() || null;

  await consulta(
    `update public.cliente_servicios
        set tipo_servicio=$3, mes_inicio=$4, soporte_valor=$5, precio_mes1=$6, bono_reactivacion=$7, nota=$8
      where id=$1 and cliente_id=$2`,
    [servicioId, clienteId, tipo, `${mes}-01`, soporteValor, precioMes1, bono, nota],
  );

  await recomputarPagosDeServicios(clienteId);
  revalidarServicio(clienteId);
  redirect(`/membresias/${clienteId}`);
}

/** Elimina un servicio adquirido y recalcula el historial (limpia sus meses). */
export async function eliminarServicio(formData: FormData) {
  if (!(await getUsuario())) redirect("/login");
  const servicioId = Number(formData.get("servicioId"));
  const clienteId = Number(formData.get("clienteId"));
  if (!servicioId || !clienteId) redirect(`/membresias/${clienteId}`);

  await consulta(`delete from public.cliente_servicios where id=$1 and cliente_id=$2`, [servicioId, clienteId]);
  await recomputarPagosDeServicios(clienteId);
  revalidarServicio(clienteId);
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
