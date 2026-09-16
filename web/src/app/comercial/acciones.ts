"use server";

import { revalidatePath } from "next/cache";
import { consulta } from "@/lib/db";
import { soloAdmin } from "@/lib/sesion";
import { tasaUsdCop } from "@/lib/fx";

/** Marca una comisión comercial como pagada o pendiente. Al pagar, congela la tasa. */
export async function marcarComisionComercial(formData: FormData) {
  await soloAdmin();
  const id = Number(formData.get("id"));
  const pagar = String(formData.get("pagar")) === "1";
  const fechaRaw = String(formData.get("fechaPago") ?? "").trim();
  const fechaPago = /^\d{4}-\d{2}-\d{2}$/.test(fechaRaw) ? fechaRaw : null;
  if (pagar) {
    const { cop } = await tasaUsdCop();
    await consulta(
      `update public.comision_comercial
          set estado='pagado',
              fecha_pago = coalesce($2::date, current_date),
              tasa = $3
        where id=$1`,
      [id, fechaPago, cop],
    );
  } else {
    await consulta(
      `update public.comision_comercial set estado='pendiente', fecha_pago=null, tasa=null where id=$1`,
      [id],
    );
  }
  revalidatePath("/comercial");
}
