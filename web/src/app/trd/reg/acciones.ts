"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { consulta } from "@/lib/db";
import { soloAdmin } from "@/lib/sesion";
import { primerDiaMes, uvtDeMes, recalcular } from "@/lib/reg";
import { enviarEmail, plantillaCorreoPago } from "@/lib/email";

const n = (v: FormDataEntryValue | null): number => {
  const x = Number(String(v ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(x) ? x : 0;
};

/**
 * Guarda (upsert) el pago de un colaborador para un mes: recalcula retenciones
 * con la fórmula única y persiste el snapshot. Si el colaborador no tenía datos
 * tributarios, los actualiza de paso (fuente única).
 */
export async function guardarPago(formData: FormData) {
  await soloAdmin();
  const colaboradorId = Number(formData.get("colaboradorId"));
  const mes = primerDiaMes(String(formData.get("mes") ?? ""));
  const valor = n(formData.get("valor"));
  const tarifa = n(formData.get("tarifa"));
  const salud = n(formData.get("salud"));
  const pension = n(formData.get("pension"));
  const costoTransf = n(formData.get("costoTransferencia"));
  const actividad = String(formData.get("actividad") ?? "").trim() || null;
  const identificacion = String(formData.get("identificacion") ?? "").trim() || null;

  const uvt = await uvtDeMes(mes);
  const { reteIca, reteRenta, valorGirar } = recalcular(valor, tarifa, salud, pension, uvt);

  await consulta(
    `insert into public.reg_pago
       (colaborador_id, identificacion, actividad_ciiu, tarifa_ica_mil, mes,
        valor_cuenta_cobro, aporte_salud, aporte_pension,
        rete_ica, rete_renta, valor_girar, costo_transferencia, actualizado_en)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, now())
     on conflict (colaborador_id, mes) where colaborador_id is not null
     do update set identificacion=$2, actividad_ciiu=$3, tarifa_ica_mil=$4,
        valor_cuenta_cobro=$6, aporte_salud=$7, aporte_pension=$8,
        rete_ica=$9, rete_renta=$10, valor_girar=$11, costo_transferencia=$12,
        actualizado_en=now()`,
    [colaboradorId, identificacion, actividad, tarifa, mes, valor, salud, pension,
     reteIca, reteRenta, valorGirar, costoTransf],
  );

  // Sincroniza los datos tributarios en la ficha del colaborador (fuente única).
  await consulta(
    `update public.colaboradores
        set identificacion = coalesce($2, identificacion),
            actividad_ciiu = coalesce($3, actividad_ciiu),
            tarifa_ica_mil = $4
      where id = $1`,
    [colaboradorId, identificacion, actividad, tarifa],
  );

  revalidatePath("/trd/reg");
}

/** Marca/desmarca uno de los 4 checks del proceso de pago. */
export async function toggleCheck(formData: FormData) {
  await soloAdmin();
  const pagoId = Number(formData.get("pagoId"));
  const campo = String(formData.get("campo"));
  const valor = String(formData.get("valor")) === "1";
  const permitidos = ["ck_correo", "ck_drive", "ck_registro", "ck_pagado"];
  if (!permitidos.includes(campo)) return;

  await consulta(
    `update public.reg_pago set ${campo} = $2, actualizado_en = now() where id = $1`,
    [pagoId, valor],
  );
  revalidatePath("/trd/reg");
}

/** Agrega un pago a un freelance (sin colaborador de nómina). */
export async function agregarFreelance(formData: FormData) {
  await soloAdmin();
  const mes = primerDiaMes(String(formData.get("mes") ?? ""));
  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!nombre) {
    redirect(`/trd/reg?mes=${mes.slice(0, 7)}&error=` + encodeURIComponent("El nombre del freelance es obligatorio."));
  }
  const valor = n(formData.get("valor"));
  const tarifa = n(formData.get("tarifa"));
  const salud = n(formData.get("salud"));
  const pension = n(formData.get("pension"));
  const actividad = String(formData.get("actividad") ?? "").trim() || null;
  const identificacion = String(formData.get("identificacion") ?? "").trim() || null;

  const uvt = await uvtDeMes(mes);
  const { reteIca, reteRenta, valorGirar } = recalcular(valor, tarifa, salud, pension, uvt);

  await consulta(
    `insert into public.reg_pago
       (nombre_libre, identificacion, actividad_ciiu, tarifa_ica_mil, mes,
        valor_cuenta_cobro, aporte_salud, aporte_pension,
        rete_ica, rete_renta, valor_girar)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [nombre, identificacion, actividad, tarifa, mes, valor, salud, pension, reteIca, reteRenta, valorGirar],
  );
  revalidatePath("/trd/reg");
  redirect(`/trd/reg?mes=${mes.slice(0, 7)}`);
}

/**
 * Envía al colaborador el correo con su detalle de pago (valor, retenciones,
 * girado) y marca el check de "correo enviado". Requiere Resend configurado.
 */
export async function enviarCorreoPago(formData: FormData) {
  await soloAdmin();
  const pagoId = Number(formData.get("pagoId"));

  const rows = await consulta(
    `select p.mes, p.valor_cuenta_cobro, p.rete_ica, p.rete_renta, p.valor_girar,
            c.nombre, c.email
       from public.reg_pago p
       join public.colaboradores c on c.id = p.colaborador_id
      where p.id = $1`,
    [pagoId],
  );
  const r = rows[0] as Record<string, unknown> | undefined;
  const mesISO = r ? String(r.mes).slice(0, 7) : "";
  const back = `/trd/reg?mes=${mesISO}`;

  if (!r) redirect(`${back}&error=` + encodeURIComponent("No encontré el pago."));
  const email = (r!.email as string) || "";
  if (!email) {
    redirect(`${back}&error=` + encodeURIComponent(`${r!.nombre} no tiene email en su ficha (CS → Colaboradores).`));
  }

  const mesLabel = new Date(`${mesISO}-01T00:00:00`).toLocaleDateString("es-CO", { month: "long", year: "numeric" });
  const { subject, html } = plantillaCorreoPago({
    nombre: String(r!.nombre),
    mesLabel,
    valorCuentaCobro: Number(r!.valor_cuenta_cobro),
    reteIca: Number(r!.rete_ica),
    reteRenta: Number(r!.rete_renta),
    valorGirar: Number(r!.valor_girar),
  });

  try {
    await enviarEmail({ to: email, subject, html });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error enviando el correo.";
    redirect(`${back}&error=` + encodeURIComponent(msg));
  }

  await consulta(`update public.reg_pago set ck_correo = true, actualizado_en = now() where id = $1`, [pagoId]);
  revalidatePath("/trd/reg");
  redirect(`${back}&ok=` + encodeURIComponent(`Correo enviado a ${r!.nombre}.`));
}

/** Elimina un renglón de pago (freelance o el del colaborador ese mes). */
export async function eliminarPago(formData: FormData) {
  await soloAdmin();
  const pagoId = Number(formData.get("pagoId"));
  await consulta(`delete from public.reg_pago where id = $1`, [pagoId]);
  revalidatePath("/trd/reg");
}
