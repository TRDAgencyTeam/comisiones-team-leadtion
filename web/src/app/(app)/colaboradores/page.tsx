import Link from "next/link";
import { listarColaboradores } from "@/lib/colaboradores";

export const dynamic = "force-dynamic";

const CAT_LABEL: Record<string, string> = { fundador: "Fundador", nuevo: "Nuevo" };

export default async function ColaboradoresPage() {
  let colaboradores;
  let error: string | null = null;
  try {
    colaboradores = await listarColaboradores();
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  return (
    <main className="wrap">
      <header className="page page-head-row">
        <div>
          <h1>Colaboradores</h1>
          <p>Equipo de Customer Success y roles del sistema.</p>
        </div>
        <Link href="/colaboradores/nuevo" className="btn-primary">
          + Agregar colaborador
        </Link>
      </header>

      {error && (
        <div className="card">
          <strong>No se pudo cargar.</strong>
          <p className="empty">{error}</p>
        </div>
      )}

      {colaboradores && (
        <section className="card">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Rol</th>
                  <th>Categoría</th>
                  <th>Ingreso</th>
                  <th>Fin de prueba</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {colaboradores.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/colaboradores/${c.id}`} className="link-cliente">
                        {c.nombre}
                      </Link>
                    </td>
                    <td>{c.rol}</td>
                    <td>{c.categoria ? CAT_LABEL[c.categoria] : "—"}</td>
                    <td>{c.fechaIngreso ?? "—"}</td>
                    <td>{c.fechaFinPrueba ?? "—"}</td>
                    <td>
                      {c.activo ? (
                        <span className="estado-pagado">Activo</span>
                      ) : (
                        <span className="estado-cancelado">Inactivo</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="foot">
        Los colaboradores con categoría <b>Fundador</b> o <b>Nuevo</b> son los que
        comisionan. Haz clic en un nombre para editarlo o activar/desactivarlo.
      </p>
    </main>
  );
}
