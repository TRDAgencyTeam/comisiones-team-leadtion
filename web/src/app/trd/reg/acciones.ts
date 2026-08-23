"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { consulta } from "@/lib/db";
import { soloAdmin } from "@/lib/sesion";
import { primerDiaMes, uvtDeMes, recalcular, corteDeMes, comisionPendienteCop } from "@/lib/reg";
import { TARIFA_ICA_DEFAULT } from "@/lib/retenciones";
import { enviarEmail, plantillaCorreoPago, REPLY_TO } from "@/lib/email";
import { pagarCiclo, deshacerCiclo } from "@/lib/comisiones-pago";

// Los valores COP se digitan con puntos de miles; se limpian para guardar.
const numCO = (v: FormDataEntryValue | null): number => {
  const x = Number(String(v ?? "").replace(/[^\d]/g, ""));
  return Number.isFinite(x) ? x : 0;
};
const num = (v: unknown): number => (v == null ? 0 : Number(v));

/**
 * Guarda (upsert) el pago de un colaborador para un mes. Total = pago fijo +
 * adicional + comisión (CS, sincronizada en COP). Recalcula retenciones sobre el
 * total y persiste el snapshot.
 */
export async function guardarPago(formData: FormData) {
  await soloAdmin();
  const colaboradorId = Number(formData.get("colaboradorId"));
  const mes = primerDiaMes(String(formData.get("mes") ?? ""));
  const pagoFijo = numCO(formData.get("pagoFijo"));
  const adicional = numCO(formData.get("adicional"));
  const adicionalDesc = String(formData.get("adicionalDesc") ?? "").trim() || null;

  // Comisión: la pendiente en vivo; si ya se pagó (pendiente 0) se conserva la guardada.
  let comision = await comisionPendienteCop(colaboradorId, mes);
  if (comision === 0) {
    const prev = await consulta(
      `select comision from public.reg_pago where colaborador_id=$1 and mes=$2`, [colaboradorId, mes]);
    if (prev.length) comision = num(prev[0]!.comision);
  }

  const total = pagoFijo + adicional + comision;
  const uvt = await uvtDeMes(mes);
  const { reteIca, reteRenta, valorGirar } = recalcular(total, TARIFA_ICA_DEFAULT, 0, 0, uvt);

  await consulta(
    `insert into public.reg_pago
       (colaborador_id, tarifa_ica_mil, mes, pago_fijo, adicional, adicional_desc, comision,
        valor_cuenta_cobro, rete_ica, rete_renta, valor_girar, actualizado_en)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now())
     on conflict (colaborador_id, mes) where colaborador_id is not null
     do update set tarifa_ica_mil=$2, pago_fijo=$4, adicional=$5, adicional_desc=$6, comision=$7,
        valor_cuenta_cobro=$8, rete_ica=$9, rete_renta=$10, valor_girar=$11, actualizado_en=now()`,
    [colaboradorId, TARIFA_ICA_DEFAULT, mes, pagoFijo, adicional, adicionalDesc, comision,
     total, reteIca, reteRenta, valorGirar],
  );

  // El valor base de nómina "aprende" del pago fijo → pre-llena el próximo mes.
  await consulta(`update public.colaboradores set valor_nomina = $2 where id = $1`, [colaboradorId, pagoFijo]);

  revalidatePath("/trd/reg");
}

/**
 * Marca/desmarca un check. Si es "Pagado" y es un colaborador, registra (o
 * deshace) el pago de su comisión CS de ese mes (una sola empresa paga todo).
 */
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

  // Al marcar "Pagado" a un colaborador, se registra el pago de su comisión CS.
  if (campo === "ck_pagado") {
    const rows = await consulta(
      `select colaborador_id, mes from public.reg_pago where id = $1`, [pagoId]);
    const r = rows[0] as Record<string, unknown> | undefined;
    if (r && r.colaborador_id != null) {
      const colaboradorId = Number(r.colaborador_id);
      const corte = corteDeMes(String(r.mes).slice(0, 7));
      if (valor) await pagarCiclo(colaboradorId, corte);
      else await deshacerCiclo(colaboradorId, corte);
      revalidatePath("/cs");
      revalidatePath("/cs/comisiones");
      revalidatePath("/membresias/dashboard");
    }
  }
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
  const pagoFijo = numCO(formData.get("valor"));
  const tarifa = numCO(formData.get("tarifa")) || 0;
  const actividad = String(formData.get("actividad") ?? "").trim() || null;
  const identificacion = String(formData.get("identificacion") ?? "").replace(/[^\d]/g, "") || null;

  const uvt = await uvtDeMes(mes);
  const { reteIca, reteRenta, valorGirar } = recalcular(pagoFijo, tarifa, 0, 0, uvt);

  await consulta(
    `insert into public.reg_pago
       (nombre_libre, identificacion, actividad_ciiu, tarifa_ica_mil, mes,
        pago_fijo, valor_cuenta_cobro, rete_ica, rete_renta, valor_girar)
     values ($1,$2,$3,$4,$5,$6,$6,$7,$8,$9)`,
    [nombre, identificacion, actividad, tarifa, mes, pagoFijo, reteIca, reteRenta, valorGirar],
  );
  revalidatePath("/trd/reg");
  redirect(`/trd/reg?mes=${mes.slice(0, 7)}`);
}

/** Envía al colaborador el correo con su detalle de pago y marca el check. */
export async function enviarCorreoPago(formData: FormData) {
  await soloAdmin();
  const pagoId = Number(formData.get("pagoId"));

  const rows = await consulta(
    `select p.mes, p.pago_fijo, p.adicional, p.adicional_desc, p.comision, p.valor_cuenta_cobro,
            p.rete_ica, p.rete_renta, p.valor_girar, c.nombre, c.email
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
    redirect(`${back}&error=` + encodeURIComponent(`${r!.nombre} no tiene email en su ficha (Nómina).`));
  }

  const mesLabel = new Date(`${mesISO}-01T00:00:00`).toLocaleDateString("es-CO", { month: "long", year: "numeric" });
  const { subject, html } = plantillaCorreoPago({
    nombre: String(r!.nombre),
    mesLabel,
    pagoFijo: num(r!.pago_fijo),
    adicional: num(r!.adicional),
    adicionalDescripcion: (r!.adicional_desc as string) ?? null,
    comision: num(r!.comision),
    totalCuentaCobro: num(r!.valor_cuenta_cobro),
    reteIca: num(r!.rete_ica),
    reteRenta: num(r!.rete_renta),
    valorGirar: num(r!.valor_girar),
  });

  try {
    await enviarEmail({ to: email, subject, html, replyTo: REPLY_TO });
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
