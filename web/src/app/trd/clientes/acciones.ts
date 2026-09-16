"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { consulta } from "@/lib/db";
import { soloAdmin } from "@/lib/sesion";
import { primerDiaMes } from "@/lib/facturacion";
import { tasaUsdCop } from "@/lib/fx";
import { crearClienteCompleto, recomputarPagosDeCliente, type NuevoClienteInput } from "@/app/membresias/acciones";
import { registrarComisionComercial } from "@/lib/comercial";

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

/** Si el servicio tiene costo de tercerización por unidad, genera el egreso del
 *  mes (ej. grabación: $100/hora × horas). afecta la utilidad del mes. */
async function registrarCostoTercerizacion(mes: string, servicioClave: string | null, cantidad: number) {
  if (!servicioClave || cantidad <= 0) return;
  const rows = await consulta(`select nombre, costo_persona from public.servicio_catalogo where clave = $1`, [servicioClave]);
  const c = rows[0] as Record<string, unknown> | undefined;
  const costo = c?.costo_persona != null ? Number(c.costo_persona) : 0;
  if (costo <= 0) return;
  await consulta(
    `insert into public.egreso_mensual (mes, concepto, marca, valor_usd, afecta_utilidad, categoria)
     values ($1,$2,'TRD',$3,true,'variable')`,
    [mes, `Tercerización ${String(c?.nombre ?? "servicio")} (${cantidad} × $${costo})`, Math.round(costo * cantidad * 100) / 100],
  );
}

const SERVICIOS_LEADTION = ["agente_ai", "reactivacion", "level_up"];

/** Si el servicio facturado es de Leadtion (Agente IA / Reactivación / Level Up) y
 *  el cliente es del maestro, registra el servicio en Membresías (cliente_servicios)
 *  para que corra su flujo de cobros y aparezca en el módulo, y MARCA al cliente como
 *  miembro Leadtion reflejando el plan en su hoja de vida (es_leadtion, plan_tipo,
 *  tipo_cliente). Idempotente por (cliente, tipo, mes). */
async function registrarServicioLeadtion(clienteId: number | null, servicioClave: string | null, mes: string, monto: number) {
  if (!clienteId || !servicioClave || !SERVICIOS_LEADTION.includes(servicioClave)) return;
  const mesIni = `${mes.slice(0, 7)}-01`;
  const dup = await consulta(
    `select 1 from public.cliente_servicios where cliente_id=$1 and tipo_servicio=$2 and mes_inicio=$3 limit 1`,
    [clienteId, servicioClave, mesIni],
  );
  // Comprar un servicio Leadtion vuelve miembro al cliente y refleja el plan en su
  // ficha (sin quitarle el flag de agencia si ya lo era: la agencia manda su $0).
  await consulta(
    `update public.clientes
        set es_leadtion = true, plan_tipo = $2,
            tipo_cliente = case when coalesce(es_agencia,false) then tipo_cliente else 'servicio' end,
            estado_actualizado_en = now()
      where id = $1`,
    [clienteId, servicioClave],
  );
  if (!dup.length) {
    await consulta(
      `insert into public.cliente_servicios (cliente_id, tipo_servicio, mes_inicio, fecha_compra, precio_mes1)
       values ($1,$2,$3,$3,$4)`,
      [clienteId, servicioClave, mesIni, monto > 0 ? monto : null],
    );
  }
  await recomputarPagosDeCliente(clienteId);
  revalidatePath(`/membresias/${clienteId}`);
  revalidatePath("/membresias/clientes");
  revalidatePath("/membresias/dashboard");
  revalidatePath("/trd/clientes");
}

/** Un plan de marketing con Leadtion incluida (catálogo `incluye_leadtion`) también
 *  vuelve miembro Leadtion al cliente, pero con la licencia INCLUIDA ($0, la paga el
 *  marketing). Social media / SEO / hosting / etc. NO aplican. */
async function marcarMiembroPorMarketing(clienteId: number | null, servicioClave: string | null) {
  if (!clienteId || !servicioClave || SERVICIOS_LEADTION.includes(servicioClave)) return;
  const cat = await consulta(`select coalesce(incluye_leadtion,false) il from public.servicio_catalogo where clave=$1`, [servicioClave]);
  if (!cat.length || !Boolean((cat[0] as Record<string, unknown>).il)) return;
  await consulta(
    `update public.clientes
        set es_leadtion = true, es_agencia = true, incluye_crm_en_marketing = true,
            valor_licencia_general = 0, soporte_valor = 0,
            agencia_desde = coalesce(agencia_desde, current_date), estado_actualizado_en = now()
      where id = $1`,
    [clienteId],
  );
  revalidatePath(`/membresias/${clienteId}`);
  revalidatePath("/membresias/clientes");
  revalidatePath("/membresias/dashboard");
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
  await registrarCostoTercerizacion(mes, servicioClave, Number(formData.get("personas") ?? 0));
  // Si es un servicio Leadtion de un cliente del maestro, sincroniza Membresías.
  await registrarServicioLeadtion(d.clienteId, servicioClave, mes, d.facturado);
  // Si es un plan de marketing con Leadtion incluida, lo vuelve miembro (licencia $0).
  await marcarMiembroPorMarketing(d.clienteId, servicioClave);
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
  const comercialIds = formData.getAll("comercialIds").map((v) => Number(v)).filter(Boolean);
  const afiliadoRef = String(formData.get("afiliadoRef") ?? "").trim() || null;
  const medio = txt(formData.get("medio")) ?? (entidad === "COL" ? "bancolombia" : "stripe");
  const estado = String(formData.get("estado") ?? "por_facturar");

  const precios = [1, 2, 3, 4].map((i) => n(formData.get(`precioMes${i}`)));

  // Deriva reglas del catálogo (no confiamos en flags del cliente).
  const cat = await consulta(
    `select nombre, categoria, recurrente, aplica_reserva, incluye_leadtion,
            coalesce(comisiona_comercial,true) comisiona_comercial
       from public.servicio_catalogo where clave = $1`,
    [servicioClave],
  );
  const c = cat[0] as Record<string, unknown> | undefined;
  const categoria = String(c?.categoria ?? "agencia");
  const incluyeLeadtion = Boolean(c?.incluye_leadtion);
  const comisionaComercial = c?.comisiona_comercial !== false; // excluidos: hosting, dominio, grabación, camp 90/10
  // "Agencia" (Leadtion incluida) SOLO si el servicio realmente lleva Leadtion
  // (ej. Plan Marketing Ads+IA+CRM). Social media/SEO/Canva → NO es cuenta Leadtion.
  const esAgencia = categoria === "agencia" && incluyeLeadtion;
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

  // La comisión comercial SOLO aplica a clientes NUEVOS (no reutilizados/existentes).
  const esClienteNuevo = !existenteId;

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
    // Marca Leadtion si el servicio lo lleva (nunca lo quita a un miembro existente).
    if (incluyeLeadtion) await consulta(`update public.clientes set es_leadtion = true where id = $1`, [clienteId]);
    // Si el servicio elegido es un servicio Leadtion (Agente IA / Reactivación / Level Up),
    // regístralo en Membresías para que corra su flujo de cobros y refleje el plan.
    if (planLeadtion) await registrarServicioLeadtion(clienteId, planLeadtion, mes, precios[0] || 0);
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
      // Miembro Leadtion si el plan de marketing lo incluye O si compró un servicio Leadtion.
      esLeadtion: incluyeLeadtion || !!planLeadtion,
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
  const facRows = await consulta(
    `insert into public.factura_mensual
       (mes, entidad, cliente_id, cliente_nombre, reserva, recurrente, servicios, precio_desglose,
        facturado, medio, iva_pct, estado, mes_contrato, servicio_clave, tasa)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,1,$13,$14) returning id`,
    [mes, entidad, clienteId, nombreFactura, reserva, recurrente, nombreServicio, desglose,
     facturado, medio, ivaPct, estado, servicioClave, tasaVal],
  );
  await registrarCostoTercerizacion(mes, servicioClave, personas);

  // Comisión del equipo comercial: 10% de la venta neta, SOLO si es cliente NUEVO
  // y el admin marcó al comercial. Una vez (sobre esta primera factura).
  const facturaId = facRows[0]?.id != null ? Number(facRows[0]!.id) : null;
  if (esClienteNuevo && comisionaComercial && facturaId && comercialIds.length) {
    for (const colId of comercialIds) {
      await registrarComisionComercial({
        clienteId, facturaId, colaboradorId: colId, mes: mes.slice(0, 7), facturado, medio,
      });
    }
    revalidatePath("/comercial");
  }

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
  let valorUsd = n(formData.get("valorUsd"));
  const valorCop = txt(formData.get("valorCop")) ? n(formData.get("valorCop")) : null;
  // Se puede ingresar COP o USD; si solo hay COP, se calcula el USD con la tasa del día.
  if (!valorUsd && valorCop) { const { cop: tasa } = await tasaUsdCop(); valorUsd = Math.round((valorCop / tasa) * 100) / 100; }
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

export async function editarEgreso(formData: FormData) {
  await soloAdmin();
  const id = Number(formData.get("id"));
  const concepto = String(formData.get("concepto") ?? "").trim();
  if (!concepto) return;
  const marca = txt(formData.get("marca"));
  let valorUsd = n(formData.get("valorUsd"));
  const valorCop = txt(formData.get("valorCop")) ? n(formData.get("valorCop")) : null;
  if (!valorUsd && valorCop) { const { cop: tasa } = await tasaUsdCop(); valorUsd = Math.round((valorCop / tasa) * 100) / 100; }
  await consulta(
    `update public.egreso_mensual set concepto=$2, marca=$3, valor_usd=$4, valor_cop=$5 where id=$1`,
    [id, concepto, marca, valorUsd, valorCop],
  );
  revalidatePath("/trd/clientes/egresos");
  revalidatePath("/trd/clientes");
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

export async function editarIngreso(formData: FormData) {
  await soloAdmin();
  const id = Number(formData.get("id"));
  const concepto = String(formData.get("concepto") ?? "").trim();
  const valorUsd = n(formData.get("valorUsd"));
  const categoria = txt(formData.get("categoria"));
  if (!concepto) return;
  await consulta(
    `update public.ingreso_mensual set concepto=$2, valor_usd=$3, categoria=$4 where id=$1`,
    [id, concepto, valorUsd, categoria],
  );
  revalidatePath("/trd/clientes/facturacion");
  revalidatePath("/trd/clientes");
}

export async function eliminarIngreso(formData: FormData) {
  await soloAdmin();
  const id = Number(formData.get("id"));
  await consulta(`delete from public.ingreso_mensual where id=$1`, [id]);
  revalidatePath("/trd/clientes/egresos");
  revalidatePath("/trd/clientes/facturacion");
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
  // Sincroniza a Membresías los ítems que sean servicios Leadtion.
  const fr = await consulta(`select cliente_id, to_char(mes,'YYYY-MM') mes from public.factura_mensual where id=$1`, [facturaId]);
  const cid = fr[0]?.cliente_id != null ? Number(fr[0]!.cliente_id) : null;
  const fmes = fr[0]?.mes ? String(fr[0]!.mes) : "";
  if (cid && fmes) {
    for (let i = 0; i < conceptos.length; i++) {
      const clave = claves[i] || "";
      if (SERVICIOS_LEADTION.includes(clave)) await registrarServicioLeadtion(cid, clave, fmes, montos[i] ?? 0);
      else await marcarMiembroPorMarketing(cid, clave);
    }
  }
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
  // Fecha de pago: si viene del popup de confirmación (fechaPago) se usa esa (el
  // cliente pudo pagar otro día, ej. fin de semana); si no, la de hoy cuando aún
  // no había. Al Facturar/Pagar, la fecha de factura se pone si faltaba.
  const fechaPago = /^\d{4}-\d{2}-\d{2}$/.test(String(formData.get("fechaPago") ?? "")) ? String(formData.get("fechaPago")) : null;
  await consulta(
    `update public.factura_mensual
        set estado = $2,
            fecha_pago    = case when $2 = 'pagado' then coalesce($3::date, case when fecha_pago is null then current_date else fecha_pago end) else fecha_pago end,
            fecha_factura = case when $2 in ('facturado','pagado') and fecha_factura is null then current_date else fecha_factura end,
            actualizado_en = now()
      where id = $1`,
    [id, estado, fechaPago],
  );
  revalidatePath("/trd/clientes");
  revalidatePath("/trd/clientes/facturacion");
}

export interface AnalisisCierre {
  facturaId: number;
  clienteNombre: string;
  entidad: string;
  agencia: { itemId: number | null; concepto: string; monto: number }[];
  leadtion: { clienteId: number; estado: string; valorUsd: number; esAgencia: boolean } | null;
}

/**
 * Analiza una factura antes del cierre: sus servicios de agencia (ítems o el
 * servicio combinado) y si el cliente está vinculado a una cuenta Leadtion
 * (maestro `clientes`, resuelto por cliente_id o por nombre) con su estado y valor.
 */
export async function analizarCierre(facturaId: number): Promise<AnalisisCierre | null> {
  await soloAdmin();
  const rows = await consulta(
    `select id, cliente_id, cliente_nombre, servicios, facturado, entidad from public.factura_mensual where id = $1`,
    [facturaId],
  );
  const f = rows[0] as Record<string, unknown> | undefined;
  if (!f) return null;
  const items = await consulta(`select id, concepto, monto from public.factura_item where factura_id = $1 order by orden, id`, [facturaId]);
  const agencia = items.length
    ? items.map((it: Record<string, unknown>) => ({ itemId: Number(it.id), concepto: String(it.concepto), monto: Number(it.monto) }))
    : [{ itemId: null, concepto: String(f.servicios ?? "Servicio"), monto: Number(f.facturado ?? 0) }];

  let cid = f.cliente_id != null ? Number(f.cliente_id) : null;
  if (!cid && f.cliente_nombre) {
    // Match insensible a acentos/mayúsculas ("María José Río" == "Maria Jose Rio").
    const m = await consulta(
      `select id from public.clientes
        where translate(lower(trim(nombre)), 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')
            = translate(lower(trim($1)),     'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')
        order by id limit 1`,
      [f.cliente_nombre],
    );
    if (m.length) cid = Number(m[0]!.id);
  }
  let leadtion: AnalisisCierre["leadtion"] = null;
  if (cid) {
    const c = await consulta(`select estado_actual, valor_licencia_general, es_agencia from public.clientes where id = $1`, [cid]);
    if (c.length) {
      leadtion = {
        clienteId: cid, estado: String(c[0]!.estado_actual),
        valorUsd: c[0]!.valor_licencia_general != null ? Number(c[0]!.valor_licencia_general) : 0,
        esAgencia: Boolean(c[0]!.es_agencia),
      };
    }
  }
  return { facturaId, clienteNombre: String(f.cliente_nombre), entidad: String(f.entidad), agencia, leadtion };
}

/**
 * Confirma el cierre elegido en el popup: desactiva los servicios de agencia
 * marcados (anula la factura si quedan 0; si no, la reescribe con lo que queda) y,
 * si se desactivó Leadtion, cancela/pausa al cliente (→ Membresías y CS).
 */
export async function confirmarCierre(formData: FormData) {
  await soloAdmin();
  const facturaId = Number(formData.get("facturaId"));
  const anularFactura = String(formData.get("anularFactura")) === "1";
  const offItemIds = formData.getAll("offItem").map((v) => Number(v)).filter(Boolean);
  const clienteId = formData.get("clienteId") ? Number(formData.get("clienteId")) : null;
  // Resultado de la cuenta Leadtion: igual | licencia | soporte | pausar | cancelar
  const ltRes = String(formData.get("leadtionResultado") ?? "igual");
  const ltValor = n(formData.get("leadtionValor"));
  const motivo = txt(formData.get("motivo"));

  if (anularFactura) {
    await consulta(`update public.factura_mensual set estado='anulado', actualizado_en=now() where id=$1`, [facturaId]);
  } else if (offItemIds.length) {
    await consulta(`delete from public.factura_item where id = any($1::int[]) and factura_id=$2`, [offItemIds, facturaId]);
    const rest = await consulta(`select concepto, monto from public.factura_item where factura_id=$1 order by orden, id`, [facturaId]);
    if (rest.length === 0) {
      await consulta(`update public.factura_mensual set estado='anulado', actualizado_en=now() where id=$1`, [facturaId]);
    } else {
      const total = rest.reduce((s, r) => s + Number(r.monto), 0);
      const servicios = rest.map((r) => String(r.concepto)).join(" + ");
      await consulta(`update public.factura_mensual set facturado=$2, servicios=$3, actualizado_en=now() where id=$1`, [facturaId, total, servicios]);
    }
  }

  if (clienteId && ltRes !== "igual") {
    if (ltRes === "cancelar" || ltRes === "pausar") {
      const estado = ltRes === "pausar" ? "pausado" : "cancelado";
      await consulta(
        `update public.clientes
            set estado_actual=$2, motivo_estado=$3,
                fecha_cancelacion = case when $2='cancelado' then current_date else fecha_cancelacion end,
                estado_actualizado_en=now()
          where id=$1`,
        [clienteId, estado, motivo],
      );
      await consulta(`insert into public.cliente_estado_historial (cliente_id, estado, motivo) values ($1,$2,$3)`,
        [clienteId, estado, motivo ?? "Cierre desde Facturación (madre)"]);
    } else if (ltRes === "licencia" || ltRes === "soporte") {
      // Baja agencia y queda como miembro que paga: licencia $69 o soporte $X/mes.
      const valorMes = ltRes === "licencia" ? 69 : (ltValor > 0 ? ltValor : 69);
      await consulta(
        `update public.clientes
            set estado_actual='activo', es_agencia=false, incluye_crm_en_marketing=false,
                valor_licencia_general=69,
                soporte_valor = case when $2='soporte' then $3 else 0 end,
                estado_actualizado_en=now()
          where id=$1`,
        [clienteId, ltRes, ltRes === "soporte" ? valorMes : 0],
      );
      // Cobro mensual de ahí en adelante (mecanismo de Membresías: período de soporte indefinido).
      const desde = `${new Date().toISOString().slice(0, 7)}-01`;
      await consulta(
        `insert into public.cliente_soportes (cliente_id, valor, desde, hasta, nota) values ($1,$2,$3,null,$4)`,
        [clienteId, valorMes, desde, ltRes === "licencia" ? "Solo licencia (cierre de agencia)" : "Plan de soporte (cierre de agencia)"],
      );
      await recomputarPagosDeCliente(clienteId);
      await consulta(`insert into public.cliente_estado_historial (cliente_id, estado, motivo) values ($1,'activo',$2)`,
        [clienteId, motivo ?? (ltRes === "licencia" ? "Queda solo con licencia $69" : `Queda con plan de soporte $${valorMes}`)]);
    }
    revalidatePath("/membresias/clientes");
    revalidatePath("/membresias/dashboard");
    revalidatePath(`/membresias/${clienteId}`);
    revalidatePath("/cs");
  }
  revalidatePath("/trd/clientes/facturacion");
  revalidatePath("/trd/clientes");
}

export async function eliminarFactura(formData: FormData) {
  await soloAdmin();
  const id = Number(formData.get("id"));
  await consulta(`delete from public.factura_mensual where id=$1`, [id]);
  revalidatePath("/trd/clientes");
}

