"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { consulta } from "@/lib/db";
import { getUsuario } from "@/lib/supabase/server";

const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
/** '2026-08-15' -> "agosto 2026" (formato que usa el motor). */
function fechaAMesTexto(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  return `${MESES[(m ?? 1) - 1]} ${y}`;
}

/** Registra el pago de una comisión (con fecha, monto, notas y comprobante). */
export async function registrarPagoAfiliado(formData: FormData) {
  if (!(await getUsuario())) redirect("/login");
  const clienteRef = String(formData.get("clienteRef"));
  const mesNum = Number(formData.get("mesNum"));
  const fecha = String(formData.get("fecha") ?? "").trim() || new Date().toISOString().slice(0, 10);
  const monto = Number(formData.get("monto"));
  const notas = String(formData.get("notas") ?? "").trim() || null;
  const comprobante = String(formData.get("comprobante") ?? "").trim() || null;

  const existe = await consulta(
    `select 1 from public.pagos_afiliados where cliente_ref=$1 and mes_num=$2 limit 1`,
    [clienteRef, mesNum],
  );
  if (existe.length === 0) {
    await consulta(
      `insert into public.pagos_afiliados (ref, cliente_ref, mes_num, fecha_pago, monto, notas, comprobante_nombre)
       values ($1,$2,$3,$4,$5,$6,$7)`,
      [`pago-${clienteRef}-${mesNum}-${Date.now()}`, clienteRef, mesNum, fecha, monto, notas, comprobante],
    );
  }
  revalidatePath("/afiliados");
  revalidatePath("/afiliados/comisiones");
  redirect("/afiliados/comisiones");
}

/** Deshace el pago de una comisión (cliente + mes). */
export async function deshacerPagoAfiliado(formData: FormData) {
  if (!(await getUsuario())) redirect("/login");
  const clienteRef = String(formData.get("clienteRef"));
  const mesNum = Number(formData.get("mesNum"));
  await consulta(`delete from public.pagos_afiliados where cliente_ref=$1 and mes_num=$2`, [clienteRef, mesNum]);
  revalidatePath("/afiliados");
  revalidatePath("/afiliados/comisiones");
}

/** Crea un afiliado nuevo (agencia con % o partner por nivel). */
export async function crearAfiliado(formData: FormData) {
  if (!(await getUsuario())) redirect("/login");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim() || null;
  const tipo = String(formData.get("tipo") ?? "partner");
  const ingreso = String(formData.get("ingreso") ?? "").trim() || null;
  const notas = String(formData.get("notas") ?? "").trim() || null;
  const comRaw = String(formData.get("comision_agencia") ?? "").trim();
  const comision = tipo === "agencia" && comRaw !== "" ? Number(comRaw) : tipo === "partner" ? -1 : null;

  if (!nombre) redirect("/afiliados/afiliados/nuevo?error=" + encodeURIComponent("El nombre es obligatorio."));

  await consulta(
    `insert into public.afiliados (ref,nombre,email,tipo,ingreso,notas,comision_agencia,creado_en)
     values ($1,$2,$3,$4,$5,$6,$7,now())`,
    [`afl-${Date.now()}`, nombre, email, tipo, ingreso, notas, comision],
  );
  revalidatePath("/afiliados");
  redirect("/afiliados/afiliados");
}

/** Edita un afiliado (nombre, tipo, %, email, notas). */
export async function editarAfiliado(formData: FormData) {
  if (!(await getUsuario())) redirect("/login");
  const ref = String(formData.get("ref"));
  const nombre = String(formData.get("nombre") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim() || null;
  const tipo = String(formData.get("tipo") ?? "partner");
  const notas = String(formData.get("notas") ?? "").trim() || null;
  const comRaw = String(formData.get("comision_agencia") ?? "").trim();
  const comision = tipo === "agencia" && comRaw !== "" ? Number(comRaw) : tipo === "partner" ? -1 : null;

  if (!nombre) redirect(`/afiliados/afiliados/${ref}?error=` + encodeURIComponent("El nombre es obligatorio."));

  await consulta(
    `update public.afiliados set nombre=$2, email=$3, tipo=$4, notas=$5, comision_agencia=$6 where ref=$1`,
    [ref, nombre, email, tipo, notas, comision],
  );
  revalidatePath("/afiliados");
  revalidatePath(`/afiliados/afiliados/${ref}`);
  redirect(`/afiliados/afiliados/${ref}`);
}

/** Crea un cliente referido (con licencia y, opcionalmente, un servicio). */
export async function crearClienteAfiliado(formData: FormData) {
  if (!(await getUsuario())) redirect("/login");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim() || null;
  const afiliadoRef = String(formData.get("afiliadoRef") ?? "").trim() || null;
  const fechaRaw = String(formData.get("fechaInicio") ?? "").trim();
  const precio = Number(formData.get("precioLicencia") || 69);
  const srvTipo = String(formData.get("servicioTipo") ?? "").trim();
  const srvPrecio = String(formData.get("servicioPrecio") ?? "").trim();

  if (!nombre || !afiliadoRef || !fechaRaw) {
    redirect("/afiliados/clientes/nuevo?error=" + encodeURIComponent("Nombre, afiliado y fecha de inicio son obligatorios."));
  }
  const fechaInicio = fechaAMesTexto(fechaRaw);
  const ref = `cl-${Date.now()}`;
  await consulta(
    `insert into public.clientes_afiliados (ref,nombre,email,afiliado_ref,fecha_inicio,precio_licencia,creado_en)
     values ($1,$2,$3,$4,$5,$6,now())`,
    [ref, nombre, email, afiliadoRef, fechaInicio, precio],
  );
  if (srvTipo && srvPrecio) {
    await consulta(
      `insert into public.servicios_afiliados (ref,cliente_ref,tipo,precio) values ($1,$2,$3,$4)`,
      [`srv-${Date.now()}`, ref, srvTipo, Number(srvPrecio)],
    );
  }
  revalidatePath("/afiliados");
  redirect("/afiliados/clientes");
}

/**
 * Elimina un cliente referido de Afiliados (y sus servicios/pagos). Úsalo para
 * quitar duplicados. NO toca el cliente de Membresías/Leadtion (tabla aparte).
 */
export async function eliminarClienteAfiliado(formData: FormData) {
  if (!(await getUsuario())) redirect("/login");
  const ref = String(formData.get("ref") ?? "").trim();
  if (!ref) return;
  await consulta(`delete from public.pagos_afiliados where cliente_ref = $1`, [ref]);
  await consulta(`delete from public.servicios_afiliados where cliente_ref = $1`, [ref]);
  await consulta(`delete from public.clientes_afiliados where ref = $1`, [ref]);
  revalidatePath("/afiliados/clientes");
  revalidatePath("/afiliados");
  revalidatePath("/afiliados/comisiones");
}
