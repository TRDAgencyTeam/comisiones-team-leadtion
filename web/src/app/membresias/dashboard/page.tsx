import { calcularPnL } from "@/lib/pnl";
import { guardarReselling } from "../acciones";

export const dynamic = "force-dynamic";

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const mesLargo = (m: string) => { const [y, mm] = m.split("-").map(Number); return `${MESES[(mm ?? 1) - 1]} ${y}`; };

export default async function PnLDashboard() {
  let pnl = null, error: string | null = null;
  try { pnl = await calcularPnL(); } catch (e) { error = e instanceof Error ? e.message : String(e); }

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
            <div className="kpi kpi-pag"><span className="kpi-label">Ingresos del mes</span><span className="kpi-num">{usd(pnl.ingresos.total)}</span></div>
            <div className="kpi kpi-pend"><span className="kpi-label">Costos del mes</span><span className="kpi-num">{usd(pnl.costos.total)}</span></div>
            <div className={pnl.neto >= 0 ? "kpi kpi-pag" : "kpi kpi-pend"}><span className="kpi-label">Ganancia neta</span><span className="kpi-num">{usd(pnl.neto)}</span></div>
          </div>

          <div className="pnl-cols">
            <section className="card">
              <div className="card-head"><span className="who">Ingresos</span><span className="t-pagado"><b>{usd(pnl.ingresos.total)}</b></span></div>
              <table><tbody>
                <tr><td>Licencias y servicios cobrados</td><td className="num">{usd(pnl.ingresos.licenciasServicios)}</td></tr>
                <tr><td>API vendida (gana $2 c/u)</td><td className="num">{usd(pnl.ingresos.apiVendida)}</td></tr>
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
                <tr><td>APIs incluidas ($10 c/u)</td><td className="num">{usd(pnl.costos.apisIncluidas)}</td></tr>
                <tr><td>Comisiones CS (mes)</td><td className="num">{usd(pnl.costos.comisionesCS)}</td></tr>
                <tr><td>Comisiones afiliados (mes)</td><td className="num">{usd(pnl.costos.comisionesAfiliados)}</td></tr>
                <tr><td>Bonos de reactivación (mes)</td><td className="num">{usd(pnl.costos.bonos)}</td></tr>
              </tbody></table>
            </section>
          </div>

          <p className="foot">
            Nómina convertida con la tasa {pnl.tasa.enVivo ? "en vivo" : "de respaldo"}:
            {" "}1 USD ≈ ${pnl.tasa.cop.toLocaleString("es-CO")} COP. Las comisiones CS del
            mes son las de hitos que caen en {mesLargo(pnl.mes)}.
          </p>
        </>
      )}
    </main>
  );
}
