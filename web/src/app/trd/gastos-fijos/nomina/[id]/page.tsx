import Link from "next/link";
import { notFound } from "next/navigation";
import { soloAdmin } from "@/lib/sesion";
import { obtenerPersona } from "@/lib/nomina";
import { PersonaForm } from "@/components/PersonaForm";
import { actualizarPersona } from "../acciones";

export const metadata = { title: "Editar persona" };
export const dynamic = "force-dynamic";

export default async function EditarPersonaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await soloAdmin();
  const { id } = await params;
  const { error } = await searchParams;
  const persona = await obtenerPersona(Number(id));
  if (!persona) notFound();

  return (
    <main className="wrap">
      <p><Link href="/trd/gastos-fijos/nomina" className="link-ver">← Nómina</Link></p>
      <h1>{persona.nombre}</h1>
      <p className="sub">Edita los datos de la persona. La fecha de fin se recalcula sola.</p>
      <PersonaForm action={actualizarPersona} persona={persona} error={error ? decodeURIComponent(error) : undefined} />
    </main>
  );
}
