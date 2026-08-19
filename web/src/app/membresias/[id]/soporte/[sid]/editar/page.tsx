import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerSoporte } from "@/lib/soportes";
import { editarSoporte } from "../../../../acciones";
import { SoporteForm } from "../../../servicio/SoporteForm";

export const dynamic = "force-dynamic";

export default async function EditarSoportePage({
  params, searchParams,
}: {
  params: Promise<{ id: string; sid: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id, sid } = await params;
  const { error } = await searchParams;
  const s = await obtenerSoporte(Number(sid));
  if (!s || s.clienteId !== Number(id)) notFound();

  return (
    <main className="wrap">
      <p className="volver"><Link href={`/membresias/${id}`}>← Volver a la ficha</Link></p>
      <header className="page">
        <h1>Editar período de soporte</h1>
        <p>Corrige el nivel o las fechas. Al guardar, el historial mensual se recalcula
          (los meses que el soporte deje de cubrir vuelven solos a su valor normal).</p>
      </header>

      {error && <div className="card error-box">{error}</div>}

      <section className="card">
        <SoporteForm clienteId={s.clienteId} action={editarSoporte} soporte={s} textoBoton="Guardar cambios" />
      </section>
    </main>
  );
}
