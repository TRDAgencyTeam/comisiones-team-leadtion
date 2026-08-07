import Link from "next/link";
import { listarClientes, type ClienteResumen } from "@/lib/clientes";

export const dynamic = "force-dynamic";

const CORTE_POR_DEFECTO = "2026-08-05";
const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ corte?: string }>;
}) {
  const { corte: corteParam } = await searchParams;
  const corte = corteParam || CORTE_POR_DEFECTO;

  let clientes: ClienteResumen[] | null = null;
  let error: string | null = null;
  try {
    clientes = await listarClientes(corte);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  const activos = clientes?.filter((c) => c.estado === "activo").length ?? 0;

  return (
    <main className="wrap">
      <header className="page page-head-row">
        <div>
          <h1>Clientes</h1>
          <p>
            {clientes ? `${clientes.length} clientes · ${activos} activos` : " "}
          </p>
        </div>
        <Link href="/clientes/nuevo" className="btn-primary">
          + Agregar cliente
        </Link>
      </header>

      <form className="toolbar" method="get">
        <label>
          Comisión al corte
          <input type="date" name="corte" defaultValue={corte} />
        </label>
        <button type="submit">Ver</button>
      </form>

      {error && (
        <div className="card">
          <strong>No se pudo cargar.</strong>
          <p className="empty">{error}</p>
        </div>
      )}

      {clientes && (
        <section className="card">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Activación</th>
                  <th>Estado</th>
                  <th className="num">Comisión equipo</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/clientes/${c.id}`} className="link-cliente">
                        {c.nombre}
                      </Link>
                    </td>
                    <td>{c.fechaActivacion ?? "—"}</td>
                    <td>
                      {c.estado === "activo" ? (
                        <span className="estado-pagado">Activo</span>
                      ) : (
                        <span className="estado-cancelado">Cancelado</span>
                      )}
                    </td>
                    <td className="num">
                      {c.comisionEquipo > 0 ? usd(c.comisionEquipo) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="foot">
        La columna <b>Comisión equipo</b> es lo que cada cliente representa al
        corte <code>{corte}</code>, sumando a todos los colaboradores que
        comisionan por él. Haz clic en un cliente para ver su ficha.
      </p>
    </main>
  );
}
