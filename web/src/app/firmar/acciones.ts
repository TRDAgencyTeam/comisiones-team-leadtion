"use server";

import { revalidatePath } from "next/cache";
import { consulta } from "@/lib/db";
import { registrarEvento } from "@/lib/contratos";

export interface FirmaInput { tipo: "dibujo" | "texto"; data: string; fuente?: string }

/**
 * Firma PÚBLICA de un contrato por su token (el cliente no tiene sesión). Valida el
 * token, guarda la firma y marca el contrato como firmado. Idempotente.
 */
export async function firmarContrato(token: string, firma: FirmaInput): Promise<{ ok: boolean; error?: string }> {
  if (!token || !firma?.data) return { ok: false, error: "Datos incompletos." };
  const rows = await consulta(
    `select id, estado, fecha_vence from public.contrato where token = $1`, [token]);
  const c = rows[0] as Record<string, unknown> | undefined;
  if (!c) return { ok: false, error: "Enlace no válido." };
  if (c.estado === "firmado") return { ok: true };
  if (c.estado === "anulado") return { ok: false, error: "Este contrato fue anulado." };
  if (c.fecha_vence && new Date(String(c.fecha_vence)) < new Date()) {
    await consulta(`update public.contrato set estado='vencido' where id=$1`, [Number(c.id)]);
    return { ok: false, error: "El enlace de firma ya venció. Pídele a tu asesor que lo reenvíe." };
  }
  const id = Number(c.id);
  await consulta(
    `update public.contrato set estado='firmado', fecha_firma=now(),
        firma_tipo=$2, firma_data=$3, firma_fuente=$4, actualizado_en=now() where id=$1`,
    [id, firma.tipo, firma.data, firma.fuente ?? null],
  );
  await registrarEvento(id, "firmado", `Contrato firmado por el cliente (${firma.tipo === "dibujo" ? "firma dibujada" : "firma escrita"})`);
  revalidatePath("/trd/contratos");
  revalidatePath(`/trd/contratos/${id}`);
  return { ok: true };
}
