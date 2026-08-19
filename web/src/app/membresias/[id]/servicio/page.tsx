import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerMembresia } from "@/lib/membresias";
import { registrarServicio, registrarSoporte } from "../../acciones";
import { RegistrarForm } from "./RegistrarForm";

export const dynamic = "force-dynamic";

export default async function RegistrarServicioPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const c = await obtenerMembresia(Number(id));
  if (!c) notFound();

  return (
    <main className="wrap">
      <p className="volver"><Link href={`/membresias/${c.id}`}>← {c.nombre}</Link></p>
      <header className="page">
        <h1>Registrar servicio o soporte</h1>
        <p><b>Servicio de entrada</b>: cuando compran Agente IA / Reactivación / Level Up (puedes
          agregar varios a la vez y ajustar el precio). <b>Período de soporte</b>: cuando activan un
          plan de soporte ($87/$119/$157) por un tiempo y luego vuelven a lo normal. Todo se genera
          en el historial automáticamente.</p>
      </header>

      {error && <div className="card error-box">{error}</div>}

      <section className="card">
        <RegistrarForm clienteId={c.id} accionServicio={registrarServicio} accionSoporte={registrarSoporte} />
      </section>
    </main>
  );
}
