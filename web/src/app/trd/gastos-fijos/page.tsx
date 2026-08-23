import { redirect } from "next/navigation";

/** Gastos Fijos: por ahora entra directo a Nómina (las demás secciones vendrán después). */
export default function GastosFijosPage() {
  redirect("/trd/gastos-fijos/nomina");
}
