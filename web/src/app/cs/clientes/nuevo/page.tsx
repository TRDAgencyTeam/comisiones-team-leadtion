import { crearCliente } from "../acciones";
import { ClienteForm } from "../ClienteForm";

export const dynamic = "force-dynamic";

export default async function NuevoClientePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="wrap">
      <header className="page">
        <h1>Agregar cliente</h1>
        <p>
          El sistema lo tendrá en cuenta automáticamente para las comisiones,
          según su fecha de activación.
        </p>
      </header>

      <section className="card">
        <ClienteForm action={crearCliente} error={error} textoBoton="Guardar cliente" />
      </section>
    </main>
  );
}
