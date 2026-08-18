import { crearColaborador } from "../acciones";
import { ColaboradorForm } from "../ColaboradorForm";

export const dynamic = "force-dynamic";

export default async function NuevoColaboradorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="wrap">
      <header className="page">
        <h1>Agregar colaborador</h1>
        <p>Se tendrá en cuenta para las comisiones según su categoría y fecha de ingreso.</p>
      </header>

      <section className="card">
        <ColaboradorForm action={crearColaborador} error={error} textoBoton="Guardar colaborador" />
      </section>
    </main>
  );
}
