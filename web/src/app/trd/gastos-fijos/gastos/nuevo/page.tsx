import Link from "next/link";
import { soloAdmin } from "@/lib/sesion";
import { GastoForm } from "@/components/GastoForm";
import { crearGasto } from "../acciones";

export const metadata = { title: "Nuevo gasto" };
export const dynamic = "force-dynamic";

export default async function NuevoGastoPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await soloAdmin();
  const { error } = await searchParams;
  return (
    <main className="wrap">
      <p><Link href="/trd/gastos-fijos/gastos" className="link-ver">← Gastos</Link></p>
      <h1>Agregar gasto</h1>
      <p className="sub">Servicio público, otro fijo, herramienta, hosting o paso de dinero.</p>
      <GastoForm action={crearGasto} error={error ? decodeURIComponent(error) : undefined} />
    </main>
  );
}
