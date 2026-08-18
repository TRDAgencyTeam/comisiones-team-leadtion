import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerMembresia } from "@/lib/membresias";
import { registrarServicio } from "../../acciones";
import { ServiciosForm } from "./ServiciosForm";

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
        <h1>Registrar servicio</h1>
        <p>Cuando un cliente compra uno o varios servicios especiales después de estar activo.
          Puedes agregar varios a la vez (ej. Agente IA + Reactivación) y ajustar el precio si
          hubo descuento. Genera los cobros automáticamente sin tocar el historial anterior.</p>
      </header>

      {error && <div className="card error-box">{error}</div>}

      <section className="card">
        <ServiciosForm clienteId={c.id} action={registrarServicio} />
      </section>
    </main>
  );
}
