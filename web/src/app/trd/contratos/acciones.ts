"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { consulta } from "@/lib/db";
import { soloAdmin } from "@/lib/sesion";
import { flash } from "@/lib/flash";
import { resumenPlanMarketing, type VarsPlanMarketing } from "@/lib/contrato-plantilla";
import { registrarEvento } from "@/lib/contratos";

export interface ContratoInput {
  id?: number;
  clienteNombre: string;
  clienteEmail?: string | null;
  clienteDomicilio?: string | null;
  plantilla: string;
  variables: VarsPlanMarketing;
  enviar?: boolean; // true = además marcar enviado
}

/** Crea o actualiza un contrato (borrador). Si `enviar`, lo marca enviado. */
export async function guardarContrato(input: ContratoInput): Promise<void> {
  await soloAdmin();
  const nombre = (input.clienteNombre || input.variables?.clienteNombre || "").trim();
  if (!nombre) throw new Error("El nombre del cliente es obligatorio.");
  const { valor, vigencia } = resumenPlanMarketing(input.variables);
  const titulo = `${nombre} — Plan Marketing Ads + IA + CRM`;

  let id = input.id ?? 0;
  if (id) {
    await consulta(
      `update public.contrato set cliente_nombre=$2, cliente_email=$3, cliente_domicilio=$4,
          plantilla=$5, titulo=$6, variables=$7, valor_resumen=$8, vigencia_resumen=$9, actualizado_en=now()
        where id=$1`,
      [id, nombre, input.clienteEmail ?? null, input.clienteDomicilio ?? null, input.plantilla, titulo,
       JSON.stringify(input.variables), valor, vigencia],
    );
    await registrarEvento(id, "editado", "Contrato actualizado");
  } else {
    const rows = await consulta(
      `insert into public.contrato
         (uuid, cliente_nombre, cliente_email, cliente_domicilio, plantilla, titulo, variables, estado, valor_resumen, vigencia_resumen)
       values ($1,$2,$3,$4,$5,$6,$7,'borrador',$8,$9) returning id`,
      [randomUUID(), nombre, input.clienteEmail ?? null, input.clienteDomicilio ?? null, input.plantilla, titulo,
       JSON.stringify(input.variables), valor, vigencia],
    );
    id = Number(rows[0]!.id);
    await registrarEvento(id, "creado", "Contrato creado desde plantilla Plan Marketing");
  }

  if (input.enviar) {
    await consulta(
      `update public.contrato set estado='enviado', fecha_envio=now(),
          fecha_vence = now() + interval '5 days', actualizado_en=now()
        where id=$1 and estado='borrador'`,
      [id],
    );
    await registrarEvento(id, "enviado", `Solicitud de firma enviada a ${input.clienteEmail ?? "el cliente"}`);
  }

  await flash(input.enviar ? "Contrato enviado" : "Borrador guardado");
  revalidatePath("/trd/contratos");
  revalidatePath(`/trd/contratos/${id}`);
  redirect(`/trd/contratos/${id}`);
}

/** Cambia el estado del contrato (manual, mientras se construye el portal de firma). */
export async function cambiarEstadoContrato(formData: FormData) {
  await soloAdmin();
  const id = Number(formData.get("id"));
  const estado = String(formData.get("estado"));
  const ok = ["borrador", "enviado", "visto", "firmado", "vencido", "anulado"];
  if (!id || !ok.includes(estado)) return;
  const firma = estado === "firmado" ? ", fecha_firma=now()" : "";
  await consulta(`update public.contrato set estado=$2${firma}, actualizado_en=now() where id=$1`, [id, estado]);
  await registrarEvento(id, estado, `Estado cambiado a "${estado}"`);
  await flash("Actualizado");
  revalidatePath("/trd/contratos");
  revalidatePath(`/trd/contratos/${id}`);
}

export async function eliminarContrato(formData: FormData) {
  await soloAdmin();
  const id = Number(formData.get("id"));
  if (!id) return;
  await consulta(`delete from public.contrato where id=$1`, [id]);
  await flash("Contrato eliminado");
  revalidatePath("/trd/contratos");
  redirect("/trd/contratos");
}
