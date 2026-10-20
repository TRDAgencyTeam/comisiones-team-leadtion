import Link from "next/link";
import { notFound } from "next/navigation";
import { soloAdmin } from "@/lib/sesion";
import { obtenerPersona, historialPagosPersona } from "@/lib/nomina";
import { listarDocumentos } from "@/lib/documentos";
import { PersonaForm } from "@/components/PersonaForm";
import { DocumentosPersona } from "@/components/DocumentosPersona";
import { NominaPagos } from "@/components/NominaPagos";
import { actualizarPersona } from "../acciones";

function mesActualISO(): string {
  const h = new Date();
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}`;
}

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
  const [docs, historial] = await Promise.all([
    listarDocumentos(persona.id),
    historialPagosPersona(persona.id),
  ]);

  return (
    <main className="wrap">
      <p><Link href="/trd/gastos-fijos/nomina" className="link-ver">← Nómina</Link></p>
      <h1>{persona.nombre}</h1>
      <p className="sub">Edita los datos de la persona. La fecha de fin se recalcula sola.</p>
      <PersonaForm action={actualizarPersona} persona={persona} error={error ? decodeURIComponent(error) : undefined} />
      <NominaPagos
        personaId={persona.id}
        esFreelance={persona.valorNomina === 0}
        historial={historial}
        mesActual={mesActualISO()}
      />
      <DocumentosPersona colaboradorId={persona.id} docs={docs} />
    </main>
  );
}
