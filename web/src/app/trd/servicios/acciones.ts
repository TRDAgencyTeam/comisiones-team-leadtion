"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { consulta } from "@/lib/db";
import { soloAdmin } from "@/lib/sesion";
import { flash } from "@/lib/flash";
import { parseMonto } from "@/lib/numero";
import { generarClaveUnica } from "@/lib/servicios-catalogo";

const n = (v: FormDataEntryValue | null): number => parseMonto(v);
const nN = (v: FormDataEntryValue | null): number | null => {
  const s = String(v ?? "").trim();
  return s === "" ? null : parseMonto(v);
};
const txt = (v: FormDataEntryValue | null): string | null => {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
};
const bool = (fd: FormData, k: string): boolean => String(fd.get(k)) === "1";

const CATEGORIAS = ["agencia", "leadtion", "ghl", "puntual"];
const MARCAS = ["agencia", "leadtion", "ambas"];

function parse(fd: FormData) {
  const nombre = String(fd.get("nombre") ?? "").trim();
  const categoria = CATEGORIAS.includes(String(fd.get("categoria"))) ? String(fd.get("categoria")) : "agencia";
  const marca = MARCAS.includes(String(fd.get("marca"))) ? String(fd.get("marca")) : "agencia";
  const recurrente = bool(fd, "recurrente");
  const porPersona = bool(fd, "porPersona");
  const precioVariable = bool(fd, "precioVariable");
  const incluyeLeadtion = bool(fd, "incluyeLeadtion");
  const comisionaComercial = bool(fd, "comisionaComercial");
  const aplicaCs = bool(fd, "aplicaCs");
  const aplicaReferido = bool(fd, "aplicaReferido");
  const aplicaReserva = bool(fd, "aplicaReserva");
  const activo = fd.get("activo") == null ? true : bool(fd, "activo");
  const minMeses = Math.min(Math.max(Math.round(Number(fd.get("minMeses")) || 1), 1), 24);
  const orden = Math.round(Number(fd.get("orden")) || 100);
  return {
    nombre, categoria, marca, recurrente, porPersona, precioVariable, incluyeLeadtion, comisionaComercial,
    aplicaCs, aplicaReferido, aplicaReserva, activo, minMeses, orden,
    precioMes1: nN(fd.get("precioMes1")),
    precioResto: nN(fd.get("precioResto")),
    precioPersona: porPersona ? nN(fd.get("precioPersona")) : null,
    costoPersona: porPersona ? nN(fd.get("costoPersona")) : null,
    unidad: porPersona ? (txt(fd.get("unidad")) ?? "persona") : null,
    notas: txt(fd.get("notas")),
  };
}

export async function crearServicio(fd: FormData) {
  await soloAdmin();
  const d = parse(fd);
  if (!d.nombre) redirect("/trd/servicios/nuevo?error=" + encodeURIComponent("El nombre es obligatorio."));
  const clave = await generarClaveUnica(d.nombre);
  // Orden automático: va al final (no se le pide al usuario).
  const ord = await consulta(`select coalesce(max(orden),100)+10 ord from public.servicio_catalogo`);
  const orden = Number(ord[0]?.ord ?? 100);
  await consulta(
    `insert into public.servicio_catalogo
       (clave, nombre, categoria, marca, recurrente, precio_variable, precio_mes1, precio_resto, min_meses,
        aplica_cs, aplica_referido, aplica_reserva, por_persona, precio_persona, costo_persona, unidad,
        incluye_leadtion, comisiona_comercial, activo, orden, notas)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
    [clave, d.nombre, d.categoria, d.marca, d.recurrente, d.precioVariable, d.precioMes1, d.precioResto, d.minMeses,
     d.aplicaCs, d.aplicaReferido, d.aplicaReserva, d.porPersona, d.precioPersona, d.costoPersona, d.unidad,
     d.incluyeLeadtion, d.comisionaComercial, d.activo, orden, d.notas],
  );
  await flash("Servicio creado");
  revalidatePath("/trd/servicios");
  revalidatePath("/trd/clientes/facturacion");
  redirect("/trd/servicios");
}

export async function actualizarServicio(fd: FormData) {
  await soloAdmin();
  const clave = String(fd.get("clave") ?? "");
  const d = parse(fd);
  if (!clave) redirect("/trd/servicios");
  if (!d.nombre) redirect(`/trd/servicios/${clave}?error=` + encodeURIComponent("El nombre es obligatorio."));
  await consulta(
    `update public.servicio_catalogo
        set nombre=$2, categoria=$3, marca=$4, recurrente=$5, precio_variable=$6, precio_mes1=$7, precio_resto=$8,
            min_meses=$9, aplica_cs=$10, aplica_referido=$11, aplica_reserva=$12, por_persona=$13,
            precio_persona=$14, costo_persona=$15, unidad=$16, incluye_leadtion=$17, comisiona_comercial=$18,
            activo=$19, notas=$20
      where clave=$1`,
    [clave, d.nombre, d.categoria, d.marca, d.recurrente, d.precioVariable, d.precioMes1, d.precioResto, d.minMeses,
     d.aplicaCs, d.aplicaReferido, d.aplicaReserva, d.porPersona, d.precioPersona, d.costoPersona, d.unidad,
     d.incluyeLeadtion, d.comisionaComercial, d.activo, d.notas],
  );
  await flash("Actualizado");
  revalidatePath("/trd/servicios");
  revalidatePath(`/trd/servicios/${clave}`);
  revalidatePath("/trd/clientes/facturacion");
  redirect("/trd/servicios");
}

/** Activa/desactiva un servicio (desactivado = no aparece en Nueva factura). */
export async function cambiarEstadoServicio(fd: FormData) {
  await soloAdmin();
  const clave = String(fd.get("clave") ?? "");
  const activar = String(fd.get("activar")) === "1";
  if (!clave) return;
  await consulta(`update public.servicio_catalogo set activo=$2 where clave=$1`, [clave, activar]);
  await flash("Actualizado");
  revalidatePath("/trd/servicios");
  revalidatePath("/trd/clientes/facturacion");
}

/** Elimina un servicio del catálogo SOLO si nunca se ha facturado (no rompe históricos). */
export async function eliminarServicio(fd: FormData) {
  await soloAdmin();
  const clave = String(fd.get("clave") ?? "");
  if (!clave) return;
  const uso = await consulta(`select 1 from public.factura_mensual where servicio_clave=$1 limit 1`, [clave]);
  if (uso.length > 0) {
    // Tiene facturas: no se borra (rompería el historial). Se desactiva.
    await consulta(`update public.servicio_catalogo set activo=false where clave=$1`, [clave]);
    await flash("Tiene facturas: se desactivó en vez de borrar");
  } else {
    await consulta(`delete from public.servicio_catalogo where clave=$1`, [clave]);
    await flash("Servicio eliminado");
  }
  revalidatePath("/trd/servicios");
  revalidatePath("/trd/clientes/facturacion");
  redirect("/trd/servicios");
}
