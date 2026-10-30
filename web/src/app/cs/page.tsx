import Link from "next/link";
import { cargarResultados, corteFinDeMes, pendientePorPagar } from "@/lib/comisiones";
import {
  estadisticasClientes,
  ingresosPorMes,
  type EstadisticasClientes,
  type IngresoMes,
} from "@/lib/clientes";
import { BarChart } from "@/components/BarChart";
import { sesionActual } from "@/lib/sesion";
import { PortalColaborador } from "./PortalColaborador";

export const dynamic = "force-dynamic";

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ corte?: string }>;
}) {
  // El mismo /cs sirve a admin (dashboard completo) y a colaboradores (portal).
  const sesion = await sesionActual();
  if (sesion.rol === "colaborador" && sesion.colaboradorId) {
    return <PortalColaborador colaboradorId={sesion.colaboradorId} nombre={sesion.nombre ?? "colaborador"} />;
  }
  if (sesion.rol === "sin_acceso") {
    return (
      <main className="wrap">
        <header className="page"><h1>Sin acceso configurado</h1></header>
        <div className="card">
          <p>Tu cuenta <b>{sesion.email}</b> aún no está vinculada a un colaborador.
            Pídele al administrador que registre este email en tu ficha de colaborador.</p>
        </div>
      </main>
    );
  }

  const { corte: corteParam } = await searchParams;
  const corte = corteParam || corteFinDeMes();

  const mesCorte = corte.slice(0, 7);
  let error: string | null = null;
  let totalPorPagar = 0;   // cortes cerrados (meses < mes del corte): se paga ya
  let totalEnCurso = 0;    // mes en curso / futuros a la fecha de corte: proyección
  let totalPagado = 0;
  let filas: {
    id: number;
    nombre: string;
    categoria: string | null;
    total: number;
    porPagar: number;
    enCurso: number;
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
      const porPagar = pendientePorPagar(r, mesCorte);
      const enCurso = Math.round((r.totalPendiente - porPagar + Number.EPSILON) * 100) / 100;
      totalPorPagar += porPagar;
      totalEnCurso += enCurso;
      totalPagado += r.totalPagado;
    }
    filas = resultados.map((r) => {
      const porPagar = pendientePorPagar(r, mesCorte);
      return {
        id: r.colaboradorId,
        nombre: r.colaboradorNombre,
        categoria: r.categoria,
        total: r.total,
        porPagar,
        enCurso: Math.round((r.totalPendiente - porPagar + Number.EPSILON) * 100) / 100,
        pagado: r.totalPagado,
      };
    });
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
            <div className="kpi kpi-pend">
              <span className="kpi-label">Por pagar (cortes cerrados)</span>
              <span className="kpi-num">{usd(round2(totalPorPagar))}</span>
            </div>
            <div className="kpi kpi-total">
              <span className="kpi-label">En curso (proyección)</span>
              <span className="kpi-num">{usd(round2(totalEnCurso))}</span>
            </div>
            <div className="kpi kpi-pag">
              <span className="kpi-label">Pagado</span>
              <span className="kpi-num">{usd(round2(totalPagado))}</span>
            </div>
          </div>
          <p className="foot" style={{ marginTop: -4 }}>
            <b>Por pagar</b> = cortes de meses ya cerrados a la fecha de corte (lo que se paga ya).
            <b> En curso</b> = lo que se está generando el mes del corte (aún no se paga; se cierra el mes siguiente).
            El costo de comisiones del P&amp;L = por pagar + en curso = {usd(round2(totalPorPagar + totalEnCurso))}.
          </p>

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
              <Link href={`/cs/comisiones?corte=${corte}`} className="link-ver">
                Ver detalle y pagar →
              </Link>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Colaborador</th>
                    <th>Categoría</th>
                    <th className="num">Por pagar</th>
                    <th className="num">En curso</th>
                    <th className="num">Pagado</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((f) => (
                    <tr key={f.id}>
                      <td>{f.nombre}</td>
                      <td>{f.categoria}</td>
                      <td className="num estado-pendiente">{usd(f.porPagar)}</td>
                      <td className="num">{usd(f.enCurso)}</td>
                      <td className="num estado-pagado">{usd(f.pagado)}</td>
                    </tr>
                  ))}
                  <tr className="fila-total">
                    <td>Total equipo</td>
                    <td></td>
                    <td className="num">{usd(round2(totalPorPagar))}</td>
                    <td className="num">{usd(round2(totalEnCurso))}</td>
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
                <Link href="/cs/clientes" className="link-ver">Ver todos →</Link>
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
                        <td><Link href={`/cs/clientes/${c.id}`} className="link-cliente">{c.nombre}</Link></td>
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
            <Link href={`/cs/comisiones?corte=${corte}`}>Comisiones</Link>.
          </p>
        </>
      )}
    </main>
  );
}
