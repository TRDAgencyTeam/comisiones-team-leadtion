import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerCliente } from "@/lib/clientes";
import { actualizarCliente } from "../../acciones";
import { ClienteForm } from "../../ClienteForm";

export const dynamic = "force-dynamic";

export default async function EditarClientePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const c = await obtenerCliente(Number(id), "2026-08-05");
  if (!c) notFound();

  return (
    <main className="wrap">
      <p className="volver">
        <Link href={`/clientes/${c.id}`}>← {c.nombre}</Link>
      </p>
      <header className="page">
        <h1>Editar cliente</h1>
        <p>Actualiza el plan, soporte y estado de marketing para reflejar la realidad.</p>
      </header>

      <section className="card">
        <ClienteForm
          action={actualizarCliente}
          cliente={{
            id: c.id,
            nombre: c.nombre,
            fechaActivacion: c.fechaActivacion,
            planTipo: c.planTipo,
            soporteValor: c.soporteValor,
            incluyeCrmMarketing: c.incluyeCrmMarketing,
            valorLicencia: c.valorLicencia,
          }}
          error={error}
          textoBoton="Guardar cambios"
        />
      </section>
    </main>
  );
}
