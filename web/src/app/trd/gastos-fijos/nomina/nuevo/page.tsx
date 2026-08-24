import Link from "next/link";
import { soloAdmin } from "@/lib/sesion";
import { PersonaForm } from "@/components/PersonaForm";
import { crearPersona } from "../acciones";

export const metadata = { title: "Nueva persona" };
export const dynamic = "force-dynamic";

export default async function NuevaPersonaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await soloAdmin();
  const { error } = await searchParams;
  return (
    <main className="wrap">
      <p><Link href="/trd/gastos-fijos/nomina" className="link-ver">← Nómina</Link></p>
      <h1>Agregar persona</h1>
      <p className="sub">Se agrega a la nómina; si la dejas activa, aparecerá en Registro contable.</p>
      <PersonaForm action={crearPersona} error={error ? decodeURIComponent(error) : undefined} />
    </main>
  );
}
