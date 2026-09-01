"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { consulta } from "@/lib/db";
import { soloAdmin } from "@/lib/sesion";
import { primerDiaMes, mesAnteriorISO } from "@/lib/facturacion";

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
  return { entidad, clienteId, clienteNombre, mrr, reserva, servicios, precioDesglose, facturado, medio, fechaFactura, fechaPago, ivaPct, estado };
}

export async function crearFactura(formData: FormData) {
  await soloAdmin();
  const mes = primerDiaMes(String(formData.get("mes") ?? ""));
  const d = parse(formData);
  const back = `/trd/clientes?mes=${mes.slice(0, 7)}`;
  if (!d.clienteNombre) redirect(`${back}&error=` + encodeURIComponent("El nombre del cliente es obligatorio."));
  await consulta(
    `insert into public.factura_mensual
       (mes, entidad, cliente_id, cliente_nombre, mrr, reserva, servicios, precio_desglose,
        facturado, medio, fecha_factura, fecha_pago, iva_pct, estado)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [mes, d.entidad, d.clienteId, d.clienteNombre, d.mrr, d.reserva, d.servicios, d.precioDesglose,
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
        set entidad=$2, cliente_id=$3, cliente_nombre=$4, mrr=$5, reserva=$6, servicios=$7,
            precio_desglose=$8, facturado=$9, medio=$10, fecha_factura=$11, fecha_pago=$12,
            iva_pct=$13, estado=$14, actualizado_en=now()
      where id=$1`,
    [id, d.entidad, d.clienteId, d.clienteNombre, d.mrr, d.reserva, d.servicios, d.precioDesglose,
     d.facturado, d.medio, d.fechaFactura, d.fechaPago, d.ivaPct, d.estado],
  );
  revalidatePath("/trd/clientes");
  redirect(`/trd/clientes?mes=${primerDiaMes(String(formData.get("mes") ?? "")).slice(0, 7)}`);
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

/** Copia las facturas (no anuladas) del mes anterior a este mes, en estado "por facturar". */
export async function copiarMesAnterior(formData: FormData) {
  await soloAdmin();
  const mes = primerDiaMes(String(formData.get("mes") ?? ""));
  const anterior = primerDiaMes(mesAnteriorISO(mes.slice(0, 7)));
  await consulta(
    `insert into public.factura_mensual
       (mes, entidad, cliente_id, cliente_nombre, mrr, reserva, servicios, precio_desglose,
        facturado, medio, iva_pct, estado)
     select $1, entidad, cliente_id, cliente_nombre, mrr, reserva, servicios, precio_desglose,
        facturado, medio, iva_pct, 'por_facturar'
       from public.factura_mensual
      where mes = $2 and estado <> 'anulado'`,
    [mes, anterior],
  );
  revalidatePath("/trd/clientes");
  redirect(`/trd/clientes?mes=${mes.slice(0, 7)}`);
}
