import { redirect } from "next/navigation";

/** La antigua vista "Gastos Fijos — Resumen" se fusionó en Egresos. */
export default function GastosFijosRoot() {
  redirect("/trd/clientes/egresos");
}
