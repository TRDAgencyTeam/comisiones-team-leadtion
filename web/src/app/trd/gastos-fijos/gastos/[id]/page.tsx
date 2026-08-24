import Link from "next/link";
import { notFound } from "next/navigation";
import { soloAdmin } from "@/lib/sesion";
import { obtenerGasto } from "@/lib/gastos-fijos";
import { GastoForm } from "@/components/GastoForm";
import { actualizarGasto } from "../acciones";

export const metadata = { title: "Editar gasto" };
export const dynamic = "force-dynamic";

export default async function EditarGastoPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await soloAdmin();
  const { id } = await params;
  const { error } = await searchParams;
  const gasto = await obtenerGasto(Number(id));
  if (!gasto) notFound();
  return (
    <main className="wrap">
      <p><Link href="/trd/gastos-fijos/gastos" className="link-ver">← Gastos</Link></p>
      <h1>{gasto.nombre}</h1>
      <GastoForm action={actualizarGasto} gasto={gasto} error={error ? decodeURIComponent(error) : undefined} />
    </main>
  );
}
