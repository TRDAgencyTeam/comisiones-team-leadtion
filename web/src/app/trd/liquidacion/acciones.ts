"use server";

import { revalidatePath } from "next/cache";
import { consulta } from "@/lib/db";
import { soloAdmin } from "@/lib/sesion";
import { primerDiaMes } from "@/lib/facturacion";
import { parseMonto } from "@/lib/numero";
import { flash } from "@/lib/flash";
import { vistaLiquidacion } from "@/lib/liquidacion";

const RUTA = "/trd/liquidacion";
const txt = (v: FormDataEntryValue | null): string | null => { const s = String(v ?? "").trim(); return s || null; };
const mesDe = (fd: FormData) => String(fd.get("mes") ?? "").slice(0, 7);

/** Liquidación del mes en borrador (la crea si no existe). Devuelve su id, o null si está cerrada. */
async function borrador(mes: string): Promise<number | null> {
  const rows = await consulta(
    `insert into public.liquidacion (mes) values ($1)
     on conflict (mes) do update set actualizado_en = now()
     returning id, estado`,
    [primerDiaMes(mes)],
  );
  const r = rows[0] as Record<string, unknown>;
  return r.estado === "cerrada" ? null : Number(r.id);
}

/** Incluir / excluir una partida automática. */
export async function marcarPartida(formData: FormData) {
  await soloAdmin();
  const id = await borrador(mesDe(formData));
  if (id == null) return;
  const clave = String(formData.get("clave") ?? "");
  const incluida = String(formData.get("incluida")) === "1";
  if (!/^((reg|eg):\d+|diezmo|auto:[a-z_]+:.{1,100})$/.test(clave)) return;
  await consulta(
    `update public.liquidacion set ajustes = ajustes || jsonb_build_object($2::text, $3::boolean), actualizado_en = now() where id = $1`,
    [id, clave, incluida],
  );
  revalidatePath(RUTA);
}

/** Línea manual (algo a cubrir que no está en Egresos) o adicional (plata extra, no es gasto). */
export async function agregarLinea(formData: FormData) {
  await soloAdmin();
  const id = await borrador(mesDe(formData));
  if (id == null) return;
  const origen = String(formData.get("origen")) === "adicional" ? "adicional" : "manual";
  const concepto = txt(formData.get("concepto"));
  const cop = parseMonto(formData.get("cop"));
  if (!concepto || cop <= 0) return;
  await consulta(
    `insert into public.liquidacion_item (liquidacion_id, origen, grupo, concepto, cop) values ($1,$2,$3,$4,$5)`,
    [id, origen, origen === "adicional" ? "Adicional (no es gasto)" : "Otros a cubrir", concepto, cop],
  );
  await flash("Agregado");
  revalidatePath(RUTA);
}

export async function eliminarLinea(formData: FormData) {
  await soloAdmin();
  await consulta(
    `delete from public.liquidacion_item i using public.liquidacion l
      where i.id = $1 and l.id = i.liquidacion_id and l.estado = 'borrador' and i.origen <> 'auto'`,
    [Number(formData.get("id"))],
  );
  revalidatePath(RUTA);
}

/** Tasa con la que se calcula cuánto bajar (la del día o la que cuadres). */
export async function guardarTasaCalculo(formData: FormData) {
  await soloAdmin();
  const id = await borrador(mesDe(formData));
  if (id == null) return;
  const tasa = parseMonto(formData.get("tasa"));
  await consulta(`update public.liquidacion set tasa_calculo = $2, actualizado_en = now() where id = $1`, [id, tasa > 500 ? tasa : null]);
  await flash("Actualizado");
  revalidatePath(RUTA);
}

/** Ingreso Elite Agent que se le paga a Mauricio Ovalle (siempre en USD). */
export async function guardarElite(formData: FormData) {
  await soloAdmin();
  const id = await borrador(mesDe(formData));
  if (id == null) return;
  const usd = parseMonto(formData.get("eliteUsd"));
  await consulta(`update public.liquidacion set elite_usd = $2, actualizado_en = now() where id = $1`, [id, usd > 0 ? usd : null]);
  await flash("Actualizado");
  revalidatePath(RUTA);
}

/**
 * Registra el giro real y CIERRA la liquidación: congela las partidas incluidas
 * (aunque después cambien los egresos) y los totales para el historial.
 */
export async function cerrarLiquidacion(formData: FormData) {
  await soloAdmin();
  const mes = mesDe(formData);
  const id = await borrador(mes);
  if (id == null) return;
  const usd = parseMonto(formData.get("usdEnviado"));
  const tasaBanco = parseMonto(formData.get("tasaBanco"));
  const copRecibido = parseMonto(formData.get("copRecibido")) || Math.round(usd * tasaBanco);
  const comision = parseMonto(formData.get("comisionUsd")) || null;
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(String(formData.get("fechaGiro") ?? "")) ? String(formData.get("fechaGiro")) : null;
  if (usd <= 0 || tasaBanco < 500) return;
  // El cuadre (diezmo, Elite, USD → COP y total) se congela a la TASA REAL del
  // giro (la de la sacada de Bank of America), para que la matemática sea exacta.
  const v = await vistaLiquidacion(mes, tasaBanco);

  await consulta(`delete from public.liquidacion_item where liquidacion_id = $1 and origen = 'auto'`, [id]);
  let orden = 0;
  for (const p of v.partidas.filter((x) => x.incluida)) {
    await consulta(
      `insert into public.liquidacion_item (liquidacion_id, origen, clave, grupo, concepto, cop, orden) values ($1,'auto',$2,$3,$4,$5,$6)`,
      [id, p.clave, p.grupo, p.detalle ? `${p.concepto} · ${p.detalle}` : p.concepto, p.cop, orden++],
    );
  }
  await consulta(
    `update public.liquidacion set estado = 'cerrada', tasa_calculo = $2, fecha_giro = $3, usd_enviado = $4, tasa_banco = $5,
            cop_recibido = $6, comision_usd = $7, cop_necesario = $8, cop_adicional = $9, notas = $10,
            elite_cop = $11, actualizado_en = now()
      where id = $1`,
    [id, v.tasaCalculo, fecha, usd, tasaBanco, copRecibido, comision, v.copNecesario, v.copAdicional, txt(formData.get("notas")),
     v.eliteUsd > 0 ? v.eliteCop : null],
  );
  await flash("Liquidación cerrada");
  revalidatePath(RUTA);
}

/** Reabre una liquidación cerrada (vuelve a borrador; las partidas se recalculan en vivo). */
export async function reabrirLiquidacion(formData: FormData) {
  await soloAdmin();
  const mes = mesDe(formData);
  await consulta(
    `update public.liquidacion set estado = 'borrador', actualizado_en = now() where mes = $1`,
    [primerDiaMes(mes)],
  );
  await consulta(
    `delete from public.liquidacion_item i using public.liquidacion l where l.mes = $1 and i.liquidacion_id = l.id and i.origen = 'auto'`,
    [primerDiaMes(mes)],
  );
  await flash("Reabierta");
  revalidatePath(RUTA);
}
