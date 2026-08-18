import { calcularPnL } from "@/lib/pnl";
import { ingresosPorMes, type IngresoMes } from "@/lib/clientes";
import { BarChart } from "@/components/BarChart";
import { guardarReselling } from "../acciones";

export const dynamic = "force-dynamic";

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const mesLargo = (m: string) => { const [y, mm] = m.split("-").map(Number); return `${MESES[(mm ?? 1) - 1]} ${y}`; };
const soloMes = (m: string) => { const [, mm] = m.split("-").map(Number); return MESES[(mm ?? 1) - 1] ?? ""; };

export default async function PnLDashboard() {
  let pnl = null, error: string | null = null;
  let ingresos: IngresoMes[] = [];
  try {
    [pnl, ingresos] = await Promise.all([calcularPnL(), ingresosPorMes(12)]);
  } catch (e) { error = e instanceof Error ? e.message : String(e); }

  return (
    <main className="wrap">
      <header className="page">
        <h1>Dashboard financiero</h1>
        <p>Ingresos vs costos de Leadtion · {pnl ? mesLargo(pnl.mes) : ""}</p>
      </header>

      {error && <div className="card"><strong>No se pudo calcular.</strong><p className="empty">{error}</p></div>}

      {pnl && (
        <>
          <div className="kpis kpis-4">
            <div className="kpi kpi-total"><span className="kpi-label">Cuentas activas</span><span className="kpi-num">{pnl.cuentasActivas}</span></div>
            <div className="kpi kpi-pag"><span className="kpi-label">Ingresos de {soloMes(pnl.mes)}</span><span className="kpi-num">{usd(pnl.ingresos.total)}</span></div>
            <div className="kpi kpi-pend"><span className="kpi-label">Costos de {soloMes(pnl.mes)}</span><span className="kpi-num">{usd(pnl.costos.total)}</span></div>
            <div className={pnl.neto >= 0 ? "kpi kpi-pag" : "kpi kpi-pend"}><span className="kpi-label">{pnl.neto >= 0 ? "Ganancia" : "Pérdida"} de {soloMes(pnl.mes)}</span><span className="kpi-num">{usd(pnl.neto)}</span></div>
          </div>

          <div className="kpis kpis-2">
            <div className="kpi kpi-total"><span className="kpi-label">Licencias de {soloMes(pnl.mes)}</span><span className="kpi-num">{usd(pnl.ingresos.licencias)}</span></div>
            <div className="kpi kpi-total"><span className="kpi-label">Servicios Leadtion de {soloMes(pnl.mes)}</span><span className="kpi-num">{usd(pnl.ingresos.servicios.total)}</span></div>
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
                    { value: m.licencia, color: "var(--accent)", name: "Licencias" },
                    { value: m.servicio, color: "var(--brand-cyan)", name: "Servicios" },
                  ],
                }))}
                formatValue={(n) => (n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${Math.round(n)}`)}
                formatTitle={usd}
                ariaLabel="Ingresos por mes (licencias + servicios)"
              />
              <p className="foot" style={{ marginTop: 8 }}>
                Total del periodo:{" "}
                <b>{usd(round2(ingresos.reduce((s, m) => s + m.licencia, 0)))}</b> en licencias y{" "}
                <b>{usd(round2(ingresos.reduce((s, m) => s + m.servicio, 0)))}</b> en servicios
                (membresía fija $69 = licencia; el resto = servicio). Cada barra es el ingreso real de ese mes.
              </p>
            </section>
          )}

          <div className="pnl-cols">
            <section className="card">
              <div className="card-head"><span className="who">Ingresos</span><span className="t-pagado"><b>{usd(pnl.ingresos.total)}</b></span></div>
              <table><tbody>
                <tr><td><b>Licencias cobradas</b></td><td className="num"><b>{usd(pnl.ingresos.licencias)}</b></td></tr>
                <tr><td>Servicios Leadtion (mes)</td><td className="num">{usd(pnl.ingresos.servicios.total)}</td></tr>
                <tr><td className="td-sub">— Agente IA</td><td className="num td-sub">{usd(pnl.ingresos.servicios.agente_ai)}</td></tr>
                <tr><td className="td-sub">— Reactivación</td><td className="num td-sub">{usd(pnl.ingresos.servicios.reactivacion)}</td></tr>
                <tr><td className="td-sub">— Level Up</td><td className="num td-sub">{usd(pnl.ingresos.servicios.level_up)}</td></tr>
                <tr><td>API vendida · ganancia $2 c/u <span className="td-sub">({pnl.ingresos.apiVendidaCuentas} cuentas)</span></td><td className="num">{usd(pnl.ingresos.apiVendida)}</td></tr>
                <tr><td>Reselling reportado</td><td className="num">{usd(pnl.ingresos.reselling)}</td></tr>
              </tbody></table>
              <form action={guardarReselling} className="reselling-form">
                <input type="hidden" name="mes" value={pnl.mes} />
                <label>Reportar reselling del mes ($)
                  <input type="number" step="0.01" name="monto" defaultValue={pnl.ingresos.reselling} />
                </label>
                <button type="submit" className="btn-primary">Guardar</button>
              </form>
            </section>

            <section className="card">
              <div className="card-head"><span className="who">Costos</span><span className="t-pendiente"><b>{usd(pnl.costos.total)}</b></span></div>
              <table><tbody>
                <tr><td>Nómina Leadtion (COP→USD)</td><td className="num">{usd(pnl.costos.nomina)}</td></tr>
                {pnl.costos.nominaDetalle.map((n) => (
                  <tr key={n.nombre}><td className="td-sub">— {n.nombre} ({n.pct}%)</td><td className="num td-sub">{usd(n.usd)}</td></tr>
                ))}
                <tr><td>GoHighLevel</td><td className="num">{usd(pnl.costos.ghl)}</td></tr>
                <tr><td>APIs incluidas · costo $10 c/u <span className="td-sub">({pnl.costos.apisIncluidasCuentas} cuentas)</span></td><td className="num">{usd(pnl.costos.apisIncluidas)}</td></tr>
                <tr><td>Comisiones CS (mes)</td><td className="num">{usd(pnl.costos.comisionesCS)}</td></tr>
                <tr><td>Comisiones afiliados (mes)</td><td className="num">{usd(pnl.costos.comisionesAfiliados)}</td></tr>
                <tr><td>Bonos de reactivación (mes)</td><td className="num">{usd(pnl.costos.bonos)}</td></tr>
              </tbody></table>
            </section>
          </div>

          <p className="foot">
            Nómina convertida con la tasa {pnl.tasa.enVivo ? "en vivo" : "de respaldo"}:
            {" "}1 USD ≈ ${pnl.tasa.cop.toLocaleString("es-CO")} COP. Las comisiones CS del
            mes son las de hitos que caen en {mesLargo(pnl.mes)}. Las <b>licencias</b> son la base
            recurrente; los <b>servicios Leadtion</b> y la <b>API vendida</b> son ganancia adicional.
          </p>
        </>
      )}
    </main>
  );
}
