import Link from "next/link";
import { cargarResultados } from "@/lib/comisiones";

export const dynamic = "force-dynamic";

const CORTE_POR_DEFECTO = "2026-08-05";
const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ corte?: string }>;
}) {
  const { corte: corteParam } = await searchParams;
  const corte = corteParam || CORTE_POR_DEFECTO;

  let error: string | null = null;
  let totalMes = 0;
  let totalPendiente = 0;
  let totalPagado = 0;
  let filas: {
    id: number;
    nombre: string;
    categoria: string | null;
    total: number;
    pendiente: number;
    pagado: number;
  }[] = [];

  try {
    const resultados = await cargarResultados(corte);
    for (const r of resultados) {
      totalMes += r.total;
      totalPendiente += r.totalPendiente;
      totalPagado += r.totalPagado;
    }
    filas = resultados.map((r) => ({
      id: r.colaboradorId,
      nombre: r.colaboradorNombre,
      categoria: r.categoria,
      total: r.total,
      pendiente: r.totalPendiente,
      pagado: r.totalPagado,
    }));
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

  return (
    <main className="wrap">
      <header className="page">
        <h1>Dashboard del mes</h1>
        <p>Total de comisiones a una fecha de corte, sumando a todo el equipo.</p>
      </header>

      <form className="toolbar" method="get">
        <label>
          Fecha de corte
          <input type="date" name="corte" defaultValue={corte} />
        </label>
        <button type="submit">Ver</button>
      </form>

      {error ? (
        <div className="card">
          <strong>No se pudo calcular.</strong>
          <p className="empty">{error}</p>
        </div>
      ) : (
        <>
          <div className="kpis">
            <div className="kpi kpi-total">
              <span className="kpi-label">Total a pagar (mes)</span>
              <span className="kpi-num">{usd(round2(totalMes))}</span>
            </div>
            <div className="kpi kpi-pend">
              <span className="kpi-label">Pendiente</span>
              <span className="kpi-num">{usd(round2(totalPendiente))}</span>
            </div>
            <div className="kpi kpi-pag">
              <span className="kpi-label">Pagado</span>
              <span className="kpi-num">{usd(round2(totalPagado))}</span>
            </div>
          </div>

          <section className="card">
            <div className="card-head">
              <span className="who">Por colaborador</span>
              <Link href={`/comisiones?corte=${corte}`} className="link-ver">
                Ver detalle y pagar →
              </Link>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Colaborador</th>
                    <th>Categoría</th>
                    <th className="num">Total</th>
                    <th className="num">Pendiente</th>
                    <th className="num">Pagado</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((f) => (
                    <tr key={f.id}>
                      <td>{f.nombre}</td>
                      <td>{f.categoria}</td>
                      <td className="num">{usd(f.total)}</td>
                      <td className="num estado-pendiente">{usd(f.pendiente)}</td>
                      <td className="num estado-pagado">{usd(f.pagado)}</td>
                    </tr>
                  ))}
                  <tr className="fila-total">
                    <td>Total equipo</td>
                    <td></td>
                    <td className="num">{usd(round2(totalMes))}</td>
                    <td className="num">{usd(round2(totalPendiente))}</td>
                    <td className="num">{usd(round2(totalPagado))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <p className="foot">
            Corte <code>{corte}</code>. El total del mes es la comisión generada a
            esa fecha; se reparte en <b>pendiente</b> (falta pagar) y{" "}
            <b>pagado</b> (ya registrado). Para marcar pagos, entra a{" "}
            <Link href={`/comisiones?corte=${corte}`}>Comisiones</Link>.
          </p>
        </>
      )}
    </main>
  );
}
