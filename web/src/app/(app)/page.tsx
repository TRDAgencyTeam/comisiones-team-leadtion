import Link from "next/link";
import { cargarResultados } from "@/lib/comisiones";
import {
  estadisticasClientes,
  ingresosPorMes,
  type EstadisticasClientes,
  type IngresoMes,
} from "@/lib/clientes";
import { BarChart } from "@/components/BarChart";

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

  let stats: EstadisticasClientes | null = null;
  let ingresos: IngresoMes[] = [];

  try {
    const [resultados, est, ing] = await Promise.all([
      cargarResultados(corte),
      estadisticasClientes(),
      ingresosPorMes(12),
    ]);
    stats = est;
    ingresos = ing;
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

          {ingresos.length > 0 && (
            <section className="card">
              <div className="card-head">
                <span className="who">Ingresos por mes</span>
                <div className="leyenda">
                  <span className="leg"><i className="sw-lic" /> Licencias</span>
                  <span className="leg"><i className="sw-serv" /> Servicios</span>
                </div>
              </div>
              <BarChart
                data={ingresos.map((m) => ({
                  label: `${m.mes.slice(5)}/${m.mes.slice(2, 4)}`,
                  parts: [
                    { value: m.licencia, color: "var(--accent)" },
                    { value: m.servicio, color: "var(--brand-cyan)" },
                  ],
                }))}
                formatValue={(n) =>
                  n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${Math.round(n)}`
                }
                ariaLabel="Ingresos por mes (licencias + servicios)"
              />
              <p className="foot" style={{ marginTop: 8 }}>
                En el periodo mostrado:{" "}
                <b>{usd(round2(ingresos.reduce((s, m) => s + m.licencia, 0)))}</b> en
                licencias y{" "}
                <b>{usd(round2(ingresos.reduce((s, m) => s + m.servicio, 0)))}</b> en
                servicios (membresía fija $69 = licencia; el resto = servicio).
              </p>
            </section>
          )}

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

          {stats && (
            <section className="card">
              <div className="card-head">
                <span className="who">Clientes</span>
                <Link href="/clientes" className="link-ver">Ver todos →</Link>
              </div>
              <div className="mini-stats">
                <div className="mini-stat"><span className="ms-num">{stats.total}</span><span className="ms-lbl">Total</span></div>
                <div className="mini-stat"><span className="ms-num ms-ok">{stats.activos}</span><span className="ms-lbl">Activos</span></div>
                <div className="mini-stat"><span className="ms-num ms-warn">{stats.pausados}</span><span className="ms-lbl">Pausados</span></div>
                <div className="mini-stat"><span className="ms-num ms-bad">{stats.cancelados}</span><span className="ms-lbl">Cancelados</span></div>
                <div className="mini-stat"><span className="ms-num">{stats.conMarketing}</span><span className="ms-lbl">En marketing</span></div>
              </div>
              <h3 className="sub-h">Cuentas más antiguas (activas)</h3>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr><th>Cliente</th><th>Desde</th><th className="num">Antigüedad</th></tr>
                  </thead>
                  <tbody>
                    {stats.masAntiguos.map((c) => (
                      <tr key={c.id}>
                        <td><Link href={`/clientes/${c.id}`} className="link-cliente">{c.nombre}</Link></td>
                        <td>{c.fechaActivacion}</td>
                        <td className="num">{c.mesesActivo} {c.mesesActivo === 1 ? "mes" : "meses"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

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
