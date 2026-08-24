"use server";

import { revalidatePath } from "next/cache";
import { soloAdmin } from "@/lib/sesion";
import { guardarSnapshotMesActual } from "@/lib/gastos-fijos";

/** Guarda el snapshot del total de gastos fijos del mes actual (histórico). */
export async function guardarSnapshot() {
  await soloAdmin();
  await guardarSnapshotMesActual();
  revalidatePath("/trd/gastos-fijos");
}
