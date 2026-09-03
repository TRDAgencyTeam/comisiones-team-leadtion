"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { consulta } from "@/lib/db";
import { soloAdmin } from "@/lib/sesion";
import { primerDiaMes } from "@/lib/facturacion";
import { tasaUsdCop } from "@/lib/fx";
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
  const back = `/trd/clientes/facturacion?mes=${mes.slice(0, 7)}`;
  if (!d.clienteNombre) redirect(`/trd/clientes/nuevo?mes=${mes.slice(0, 7)}&error=` + encodeURIComponent("El nombre del cliente es obligatorio."));
  const servicioClave = txt(formData.get("servicioClave"));
  const tasaVal = d.entidad === "COL" ? (await tasaUsdCop()).cop : null;
  await consulta(
    `insert into public.factura_mensual
       (mes, entidad, cliente_id, cliente_nombre, mrr, reserva, recurrente, servicios, precio_desglose,
        facturado, medio, fecha_factura, fecha_pago, iva_pct, estado, servicio_clave, tasa, mes_contrato)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
    [mes, d.entidad, d.clienteId, d.clienteNombre, d.mrr, d.reserva, d.recurrente, d.servicios, d.precioDesglose,
     d.facturado, d.medio, d.fechaFactura, d.fechaPago, d.ivaPct, d.estado, servicioClave, tasaVal, d.recurrente ? 1 : null],
  );
  revalidatePath("/trd/clientes");
  revalidatePath("/trd/clientes/facturacion");
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
  revalidatePath("/trd/clientes/facturacion");
  redirect(`/trd/clientes/${id}`);
}

/**
 * 2º PASO — Nuevo cliente EN CASCADA desde el CATÁLOGO de servicios: crea el
 * cliente completo (→ Membresías, Afiliados, CS) y su primera factura del mes.
 * La recurrencia, referido, reserva y CS se derivan del servicio elegido.
 */
export async function crearClienteCascada(formData: FormData) {
  await soloAdmin();
  const mes = primerDiaMes(String(formData.get("mes") ?? ""));
  const nombre = String(formData.get("nombre") ?? "").trim();
  const eligioExistente = !!(Number(formData.get("clienteExistenteId")) || 0);
  const back = `/trd/clientes/facturacion?mes=${mes.slice(0, 7)}`;
  if (!nombre && !eligioExistente) redirect(`${back}&error=` + encodeURIComponent("El nombre es obligatorio."));

  const entidad = String(formData.get("entidad") ?? "LLC") === "COL" ? "COL" : "LLC";
  const servicioClave = String(formData.get("servicioClave") ?? "").trim();
  const fechaActivacion = String(formData.get("fechaActivacion") ?? "").trim() || `${mes.slice(0, 7)}-01`;
  const asignados = formData.getAll("asignados").map((v) => Number(v)).filter(Boolean);
  const afiliadoRef = String(formData.get("afiliadoRef") ?? "").trim() || null;
  const medio = txt(formData.get("medio")) ?? (entidad === "COL" ? "bancolombia" : "stripe");
  const estado = String(formData.get("estado") ?? "por_facturar");

  const precios = [1, 2, 3, 4].map((i) => n(formData.get(`precioMes${i}`)));

  // Deriva reglas del catálogo (no confiamos en flags del cliente).
  const cat = await consulta(
    `select nombre, categoria, recurrente, aplica_reserva from public.servicio_catalogo where clave = $1`,
    [servicioClave],
  );
  const c = cat[0] as Record<string, unknown> | undefined;
  const categoria = String(c?.categoria ?? "agencia");
  const esAgencia = categoria === "agencia";
  const recurrente = Boolean(c?.recurrente);
  const nombreServicio = String(c?.nombre ?? servicioClave);
  const reserva = Boolean(c?.aplica_reserva) && String(formData.get("reserva")) === "1";
  const planLeadtion = ["agente_ai", "reactivacion", "level_up"].includes(servicioClave) ? servicioClave : null;

  // ¿Reutilizar un cliente que ya existe? (evita duplicados como el caso Liliana).
  // 1) si el usuario eligió uno del buscador; 2) si el nombre normalizado coincide.
  let existenteId = Number(formData.get("clienteExistenteId")) || null;
  if (!existenteId) {
    const m = await consulta(
      `select id from public.clientes where lower(trim(nombre)) = lower(trim($1)) and estado_actual <> 'cancelado' order by id limit 1`,
      [nombre],
    );
    if (m.length) existenteId = Number(m[0]!.id);
  }

  let clienteId: number;
  let nombreFactura = nombre;
  if (existenteId) {
    clienteId = existenteId;
    const row = await consulta(`select nombre from public.clientes where id = $1`, [clienteId]);
    if (row.length) nombreFactura = String(row[0]!.nombre); // usa el nombre ya guardado
    if (esAgencia) {
      // Agencia incluye la licencia/soporte de Leadtion → se ponen en $0 (no doble cobro).
      await consulta(
        `update public.clientes set es_agencia = true, incluye_crm_en_marketing = true,
            valor_licencia_general = 0, soporte_valor = 0,
            agencia_desde = coalesce(agencia_desde, $2), estado_actualizado_en = now() where id = $1`,
        [clienteId, fechaActivacion],
      );
    }
    for (const colId of asignados) {
      await consulta(`insert into public.cliente_colaboradores (cliente_id, colaborador_id) values ($1,$2) on conflict do nothing`, [clienteId, colId]);
    }
    revalidatePath("/membresias/clientes");
    revalidatePath("/cs");
  } else {
    const datos: NuevoClienteInput = {
      nombre, fechaActivacion,
      tipoCliente: planLeadtion ? "servicio" : esAgencia ? "agencia" : "estandar",
      esAgencia, planTipo: planLeadtion,
      soporteValor: null, apiEstado: "ninguna", apiValor: null, bono: null,
      precioMes1: precios[0] || null,
      reserva, fechaInicioReal: null,
      valorLicencia: esAgencia ? 0 : 69,
      asignados, afiliadoRef, origen: "Madre / Clientes",
    };
    clienteId = await crearClienteCompleto(datos);
  }

  // Primera factura del mes (facturado = precio mes 1; desglose con los 4 meses).
  const facturado = precios[0] ?? 0;
  const personas = Number(formData.get("personas") ?? 0);
  const desglose = personas > 0
    ? `${personas} personas × $${Math.round((facturado || 0) / personas)}`
    : (precios.filter((p) => p > 0).map((p, i) => `$${p} (mes ${i + 1})`).join(" · ") || null);
  const ivaPct = entidad === "COL" ? 19 : 0;
  const tasaVal = entidad === "COL" ? (await tasaUsdCop()).cop : null;
  await consulta(
    `insert into public.factura_mensual
       (mes, entidad, cliente_id, cliente_nombre, reserva, recurrente, servicios, precio_desglose,
        facturado, medio, iva_pct, estado, mes_contrato, servicio_clave, tasa)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,1,$13,$14)`,
    [mes, entidad, clienteId, nombreFactura, reserva, recurrente, nombreServicio, desglose,
     facturado, medio, ivaPct, estado, servicioClave, tasaVal],
  );

  revalidatePath("/trd/clientes");
  revalidatePath("/trd/clientes/facturacion");
  redirect(`/trd/clientes/facturacion?mes=${mes.slice(0, 7)}`);
}

/* --- Egresos e ingresos del mes ------------------------------------------- */
export async function crearEgreso(formData: FormData) {
  await soloAdmin();
  const mes = primerDiaMes(String(formData.get("mes") ?? ""));
  const concepto = String(formData.get("concepto") ?? "").trim();
  const back = `/trd/clientes/egresos?mes=${mes.slice(0, 7)}`;
  if (!concepto) redirect(`${back}&error=` + encodeURIComponent("El concepto es obligatorio."));
  const marca = txt(formData.get("marca"));
  const fecha = txt(formData.get("fecha"));
  const valorUsd = n(formData.get("valorUsd"));
  const valorCop = txt(formData.get("valorCop")) ? n(formData.get("valorCop")) : null;
  const afectaUtilidad = String(formData.get("afectaUtilidad")) === "1";
  const categoria = txt(formData.get("categoria"));
  const subcategoria = txt(formData.get("subcategoria"));
  await consulta(
    `insert into public.egreso_mensual (mes, concepto, marca, fecha, valor_usd, valor_cop, afecta_utilidad, categoria, subcategoria)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [mes, concepto, marca, fecha, valorUsd, valorCop, afectaUtilidad, categoria, subcategoria],
  );
  revalidatePath("/trd/clientes/egresos");
  revalidatePath("/trd/clientes");
  redirect(back);
}

export async function eliminarEgreso(formData: FormData) {
  await soloAdmin();
  const id = Number(formData.get("id"));
  await consulta(`delete from public.egreso_mensual where id=$1`, [id]);
  revalidatePath("/trd/clientes/egresos");
  revalidatePath("/trd/clientes");
}

export async function crearIngreso(formData: FormData) {
  await soloAdmin();
  const mes = primerDiaMes(String(formData.get("mes") ?? ""));
  const concepto = String(formData.get("concepto") ?? "").trim();
  const back = `/trd/clientes/egresos?mes=${mes.slice(0, 7)}`;
  if (!concepto) redirect(`${back}&error=` + encodeURIComponent("El concepto es obligatorio."));
  const valorUsd = n(formData.get("valorUsd"));
  const categoria = txt(formData.get("categoria"));
  await consulta(
    `insert into public.ingreso_mensual (mes, concepto, valor_usd, categoria) values ($1,$2,$3,$4)`,
    [mes, concepto, valorUsd, categoria],
  );
  revalidatePath("/trd/clientes/egresos");
  revalidatePath("/trd/clientes");
  redirect(back);
}

export async function eliminarIngreso(formData: FormData) {
  await soloAdmin();
  const id = Number(formData.get("id"));
  await consulta(`delete from public.ingreso_mensual where id=$1`, [id]);
  revalidatePath("/trd/clientes/egresos");
  revalidatePath("/trd/clientes");
}

/**
 * Reemplaza los servicios (líneas) de una factura y recalcula su total y texto.
 * Los servicios se eligen de la lista (catálogo), varios por cliente/mes.
 */
export async function guardarServiciosFactura(formData: FormData) {
  await soloAdmin();
  const facturaId = Number(formData.get("facturaId"));
  const claves = formData.getAll("itemClave").map((v) => String(v));
  const conceptos = formData.getAll("itemConcepto").map((v) => String(v).trim());
  const montos = formData.getAll("itemMonto").map((v) => n(v));

  await consulta(`delete from public.factura_item where factura_id = $1`, [facturaId]);
  let total = 0; const nombres: string[] = []; let primerClave: string | null = null;
  for (let i = 0; i < conceptos.length; i++) {
    const concepto = conceptos[i] || "";
    const monto = montos[i] ?? 0;
    if (!concepto && !monto) continue;
    const clave = claves[i] || null;
    if (!primerClave && clave) primerClave = clave;
    total += monto;
    if (concepto) nombres.push(concepto);
    await consulta(
      `insert into public.factura_item (factura_id, servicio_clave, concepto, monto, orden) values ($1,$2,$3,$4,$5)`,
      [facturaId, clave, concepto || "Servicio", monto, i],
    );
  }
  await consulta(
    `update public.factura_mensual
        set facturado = $2, servicios = $3,
            servicio_clave = coalesce($4, servicio_clave), actualizado_en = now()
      where id = $1`,
    [facturaId, total, nombres.join(" + ") || null, primerClave],
  );
  revalidatePath("/trd/clientes");
  revalidatePath("/trd/clientes/facturacion");
  redirect(`/trd/clientes/${facturaId}`);
}

/** Cambia solo el estado (semáforo) de una factura. */
export async function cambiarEstadoFactura(formData: FormData) {
  await soloAdmin();
  const id = Number(formData.get("id"));
  const estado = String(formData.get("estado"));
  const ok = ["pagado", "facturado", "por_facturar", "por_confirmar", "programado", "anulado"];
  if (!ok.includes(estado)) return;
  // Al marcar Pagado, registra la fecha de pago (si no había); al Facturar, la de
  // factura. Editable después en la ficha del cliente si fue un clic por error.
  await consulta(
    `update public.factura_mensual
        set estado = $2,
            fecha_pago    = case when $2 = 'pagado'    and fecha_pago    is null then current_date else fecha_pago end,
            fecha_factura = case when $2 in ('facturado','pagado') and fecha_factura is null then current_date else fecha_factura end,
            actualizado_en = now()
      where id = $1`,
    [id, estado],
  );
  revalidatePath("/trd/clientes");
  revalidatePath("/trd/clientes/facturacion");
}

export async function eliminarFactura(formData: FormData) {
  await soloAdmin();
  const id = Number(formData.get("id"));
  await consulta(`delete from public.factura_mensual where id=$1`, [id]);
  revalidatePath("/trd/clientes");
}

