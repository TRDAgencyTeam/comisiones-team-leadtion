"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { consulta } from "@/lib/db";
import { soloAdmin } from "@/lib/sesion";
import { primerDiaMes } from "@/lib/facturacion";
import { crearClienteCompleto, type NuevoClienteInput } from "@/app/membresias/acciones";

const n = (v: FormDataEntryValue | null): number => {
  const x = Number(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(x) ? x : 0;
};
const txt = (v: FormDataEntryValue | null): string | null => {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
};

function parse(formData: FormData) {
  const entidad = String(formData.get("entidad") ?? "LLC") === "COL" ? "COL" : "LLC";
  const clienteId = formData.get("clienteId") ? Number(formData.get("clienteId")) : null;
  const clienteNombre = String(formData.get("clienteNombre") ?? "").trim();
  const mrrRaw = txt(formData.get("mrr"));
  const mrr = mrrRaw ? Math.round(Number(mrrRaw)) : null;
  const reserva = String(formData.get("reserva")) === "1";
  const servicios = txt(formData.get("servicios"));
  const precioDesglose = txt(formData.get("precioDesglose"));
  const facturado = n(formData.get("facturado"));
  const medio = txt(formData.get("medio"));
  const fechaFactura = txt(formData.get("fechaFactura"));
  const fechaPago = txt(formData.get("fechaPago"));
  const ivaRaw = txt(formData.get("ivaPct"));
  const ivaPct = ivaRaw != null ? Number(ivaRaw.replace(/[^\d.]/g, "")) : entidad === "COL" ? 19 : 0;
  const estado = String(formData.get("estado") ?? "por_facturar");
  const recurrente = String(formData.get("recurrente")) === "1";
  return { entidad, clienteId, clienteNombre, mrr, reserva, recurrente, servicios, precioDesglose, facturado, medio, fechaFactura, fechaPago, ivaPct, estado };
}

export async function crearFactura(formData: FormData) {
  await soloAdmin();
  const mes = primerDiaMes(String(formData.get("mes") ?? ""));
  const d = parse(formData);
  const back = `/trd/clientes?mes=${mes.slice(0, 7)}`;
  if (!d.clienteNombre) redirect(`${back}&error=` + encodeURIComponent("El nombre del cliente es obligatorio."));
  await consulta(
    `insert into public.factura_mensual
       (mes, entidad, cliente_id, cliente_nombre, mrr, reserva, recurrente, servicios, precio_desglose,
        facturado, medio, fecha_factura, fecha_pago, iva_pct, estado)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
    [mes, d.entidad, d.clienteId, d.clienteNombre, d.mrr, d.reserva, d.recurrente, d.servicios, d.precioDesglose,
     d.facturado, d.medio, d.fechaFactura, d.fechaPago, d.ivaPct, d.estado],
  );
  revalidatePath("/trd/clientes");
  redirect(back);
}

export async function editarFactura(formData: FormData) {
  await soloAdmin();
  const id = Number(formData.get("id"));
  const d = parse(formData);
  await consulta(
    `update public.factura_mensual
        set entidad=$2, cliente_id=$3, cliente_nombre=$4, mrr=$5, reserva=$6, recurrente=$7, servicios=$8,
            precio_desglose=$9, facturado=$10, medio=$11, fecha_factura=$12, fecha_pago=$13,
            iva_pct=$14, estado=$15, actualizado_en=now()
      where id=$1`,
    [id, d.entidad, d.clienteId, d.clienteNombre, d.mrr, d.reserva, d.recurrente, d.servicios, d.precioDesglose,
     d.facturado, d.medio, d.fechaFactura, d.fechaPago, d.ivaPct, d.estado],
  );
  revalidatePath("/trd/clientes");
  redirect(`/trd/clientes?mes=${primerDiaMes(String(formData.get("mes") ?? "")).slice(0, 7)}`);
}

/**
 * 2º PASO — Nuevo cliente EN CASCADA: crea el cliente completo (→ Membresías,
 * Afiliados, CS) usando la fuente única, y de una vez su primera factura del mes.
 */
export async function crearClienteCascada(formData: FormData) {
  await soloAdmin();
  const mes = primerDiaMes(String(formData.get("mes") ?? ""));
  const nombre = String(formData.get("nombre") ?? "").trim();
  const back = `/trd/clientes/nuevo-cliente?mes=${mes.slice(0, 7)}`;
  if (!nombre) redirect(`${back}&error=` + encodeURIComponent("El nombre es obligatorio."));

  const entidad = String(formData.get("entidad") ?? "LLC") === "COL" ? "COL" : "LLC";
  const esAgencia = formData.get("esAgencia") === "1";
  const planTipo = String(formData.get("planTipo") ?? "").trim() || null;
  const fechaActivacion = String(formData.get("fechaActivacion") ?? "").trim() || `${mes.slice(0, 7)}-01`;
  const soporteRaw = String(formData.get("soporteValor") ?? "").trim();
  const precioRaw = String(formData.get("precioMes1") ?? "").trim();
  const asignados = formData.getAll("asignados").map((v) => Number(v)).filter(Boolean);
  const afiliadoRef = String(formData.get("afiliadoRef") ?? "").trim() || null;
  const reserva = String(formData.get("reserva")) === "1";

  const datos: NuevoClienteInput = {
    nombre, fechaActivacion,
    tipoCliente: planTipo ? "servicio" : esAgencia ? "agencia" : "estandar",
    esAgencia, planTipo,
    soporteValor: soporteRaw === "" ? null : Number(soporteRaw),
    apiEstado: "ninguna", apiValor: null, bono: null,
    precioMes1: precioRaw === "" ? null : Number(precioRaw),
    reserva, fechaInicioReal: null,
    valorLicencia: esAgencia ? 0 : 69,
    asignados, afiliadoRef, origen: "Madre / Clientes",
  };
  const clienteId = await crearClienteCompleto(datos);

  // Primera factura del mes, enlazada al cliente recién creado.
  const facturado = n(formData.get("facturado"));
  const medio = txt(formData.get("medio"));
  const servicios = txt(formData.get("servicios"));
  const precioDesglose = txt(formData.get("precioDesglose"));
  const ivaPct = entidad === "COL" ? (txt(formData.get("ivaPct")) ? Number(String(formData.get("ivaPct")).replace(/[^\d.]/g, "")) : 19) : 0;
  const estado = String(formData.get("estado") ?? "por_facturar");
  const recurrente = String(formData.get("recurrente")) === "1";
  await consulta(
    `insert into public.factura_mensual
       (mes, entidad, cliente_id, cliente_nombre, reserva, recurrente, servicios, precio_desglose,
        facturado, medio, iva_pct, estado)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [mes, entidad, clienteId, nombre, reserva, recurrente, servicios, precioDesglose, facturado, medio, ivaPct, estado],
  );

  revalidatePath("/trd/clientes");
  redirect(`/trd/clientes?mes=${mes.slice(0, 7)}`);
}

/** Cambia solo el estado (semáforo) de una factura. */
export async function cambiarEstadoFactura(formData: FormData) {
  await soloAdmin();
  const id = Number(formData.get("id"));
  const estado = String(formData.get("estado"));
  const ok = ["pagado", "facturado", "por_facturar", "programado", "anulado"];
  if (!ok.includes(estado)) return;
  await consulta(`update public.factura_mensual set estado=$2, actualizado_en=now() where id=$1`, [id, estado]);
  revalidatePath("/trd/clientes");
}

export async function eliminarFactura(formData: FormData) {
  await soloAdmin();
  const id = Number(formData.get("id"));
  await consulta(`delete from public.factura_mensual where id=$1`, [id]);
  revalidatePath("/trd/clientes");
}

