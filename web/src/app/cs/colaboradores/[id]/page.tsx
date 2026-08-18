import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerColaborador } from "@/lib/colaboradores";
import { actualizarColaborador, cambiarEstadoColaborador } from "../acciones";
import { ColaboradorForm } from "../ColaboradorForm";

export const dynamic = "force-dynamic";

export default async function FichaColaboradorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const colaborador = await obtenerColaborador(Number(id));
  if (!colaborador) notFound();

  return (
    <main className="wrap">
      <p className="volver">
        <Link href="/cs/colaboradores">← Colaboradores</Link>
      </p>

      <header className="page page-head-row">
        <div>
          <h1>{colaborador.nombre}</h1>
          <p>
            {colaborador.activo ? (
              <span className="estado-pagado">Activo</span>
            ) : (
              <span className="estado-cancelado">Inactivo</span>
            )}
          </p>
        </div>

        <form action={cambiarEstadoColaborador}>
          <input type="hidden" name="id" value={colaborador.id} />
          <input type="hidden" name="activar" value={colaborador.activo ? "0" : "1"} />
          <button type="submit" className={colaborador.activo ? "btn-danger" : "btn-primary"}>
            {colaborador.activo ? "Desactivar" : "Activar"}
          </button>
        </form>
      </header>

      <section className="card">
        <ColaboradorForm
          action={actualizarColaborador}
          colaborador={colaborador}
          error={error}
          textoBoton="Guardar cambios"
        />
      </section>
    </main>
  );
}
