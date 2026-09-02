import { soloAdmin } from "@/lib/sesion";
import { resumenDelMes, otrosIngresosDelMes, tendenciaMensual } from "@/lib/egresos";
import { ClientesHeader } from "@/components/ClientesHeader";
import { MovimientoModal } from "@/components/MovimientoModal";
import { TendenciaChart } from "@/components/TendenciaChart";
import { eliminarEgreso, eliminarIngreso } from "../acciones";

export const metadata = { title: "Egresos" };
export const dynamic = "force-dynamic";

const usd = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
const usd0 = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const mesISO = () => { const h = new Date(); return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}`; };
const fFecha = (iso: string | null) => { if (!iso) return "—"; const [, m, d] = iso.split("-"); return `${d}/${m}`; };

export default async function EgresosPage({ searchParams }: { searchParams: Promise<{ mes?: string; error?: string }> }) {
  await soloAdmin();
  const sp = await searchParams;
  const mes = sp.mes && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : mesISO();
  const [r, otros, tendencia] = await Promise.all([resumenDelMes(mes), otrosIngresosDelMes(mes), tendenciaMensual(mes, 8)]);
  const egresos = [...r.egresos.afectanUtilidad, ...r.egresos.saleDeCaja];
  const totalEgresos = r.egresos.totalAfectan + r.egresos.totalCaja;
  const tendEgresos = tendencia.map((t) => ({ mes: t.mes, ingresos: t.egresosTotal, neta: t.egresosUtilidad }));

  return (
    <main className="cf">
      <ClientesHeader mes={mes} activo="egresos" tasa={r.tasa} />
      {sp.error && <p className="alerta">{decodeURIComponent(sp.error)}</p>}

      <div className="cf-kpis" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="cf-kpi hero"><div className="lbl">Egresos totales del mes</div><div className="big">{usd0(totalEgresos)}</div><div className="sub">todo lo que salió (utilidad + caja)</div></div>
        <div className="cf-kpi"><div className="lbl">Egresos de utilidad</div><div className="big">{usd0(r.egresos.totalAfectan)}</div><div className="sub">bajan la utilidad del mes</div></div>
        <div className="cf-kpi"><div className="lbl">Egresos de caja</div><div className="big">{usd0(r.egresos.totalCaja)}</div><div className="sub">incluye diezmo {usd0(r.diezmo)}</div></div>
      </div>

      <div className="cf-charts">
        <div className="cf-card">
          <h3>Tendencia de egresos <span className="cf-legend"><i style={{ display: "inline-block", width: 9, height: 9, borderRadius: 3, background: "#e0653a" }} /> totales por mes · pasa el cursor</span></h3>
          <TendenciaChart datos={tendEgresos} color="#e0653a" secundarioLabel="de utilidad" />
        </div>
        <div className="cf-card">
          <h3>Peso de cada gasto (% del mes)</h3>
          {r.egresos.afectanUtilidad.map((e) => {
            const pct = r.egresos.totalAfectan > 0 ? (e.valorUsd / r.egresos.totalAfectan) * 100 : 0;
            return (
              <div key={e.id} style={{ margin: "9px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", marginBottom: 3 }}>
                  <span style={{ color: "var(--muted)" }}>{e.concepto}</span><b>{pct.toFixed(1)}%</b>
                </div>
                <div style={{ height: 6, borderRadius: 999, background: "var(--bg)", overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg,#2e2a6e,#6d5ac0)" }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="cf-sec-head">
        <h2>Egresos del mes <span className="count">{egresos.length}</span></h2>
        <MovimientoModal mes={mes} tipo="egreso" />
      </div>
      <div className="cf-table-wrap">
        <table className="cf-table">
          <thead><tr><th>Concepto</th><th>Marca</th><th>Fecha</th><th className="r">Monto</th><th>Tipo</th><th></th></tr></thead>
          <tbody>
            {egresos.map((e) => (
              <tr key={`${e.id}-${e.concepto}`}>
                <td className="nom">{e.concepto}</td>
                <td>{e.marca ?? "—"}</td>
                <td>{fFecha(e.fecha)}</td>
                <td className="r neto">{usd(e.valorUsd)}</td>
                <td><span className={`cf-tag ${e.afectaUtilidad ? "util" : "caja"}`}>{e.afectaUtilidad ? "Afecta utilidad" : "Sale de caja"}</span></td>
                <td>{e.automatico ? <span className="cf-hint" title="Automático">auto</span> : <form action={eliminarEgreso}><input type="hidden" name="id" value={e.id} /><button type="submit" className="btn-borrar" title="Eliminar">🗑️</button></form>}</td>
              </tr>
            ))}
            {egresos.length === 0 && <tr><td colSpan={6} className="cf-empty" style={{ padding: 24 }}>Sin egresos este mes.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="cf-sec-head">
        <h2>Otros ingresos del mes <span className="count">{otros.length}</span></h2>
        <MovimientoModal mes={mes} tipo="ingreso" />
      </div>
      <div className="cf-table-wrap">
        <table className="cf-table" style={{ minWidth: 0 }}>
          <thead><tr><th>Concepto</th><th className="r">Monto</th><th></th></tr></thead>
          <tbody>
            {otros.map((o) => (
              <tr key={o.id}>
                <td className="nom">{o.concepto}</td>
                <td className="r neto">{usd(o.valorUsd)}</td>
                <td><form action={eliminarIngreso}><input type="hidden" name="id" value={o.id} /><button type="submit" className="btn-borrar" title="Eliminar">🗑️</button></form></td>
              </tr>
            ))}
            {otros.length === 0 && <tr><td colSpan={3} className="cf-empty" style={{ padding: 24 }}>Sin otros ingresos este mes.</td></tr>}
          </tbody>
        </table>
      </div>

      <p className="cf-nota">
        <b>Otros ingresos del mes</b> = plata que entra pero NO es una factura de cliente de agencia: reventa/comisión Leadtion, ganancia de WhatsApp API,
        renovaciones de hosting, reservas, afiliación Brevo, etc. Suman al total de ingresos del Resumen.
        <b> Egresos de utilidad</b> bajan la utilidad del mes; <b>egresos de caja</b> (inversiones, diezmo, cuotas) bajan la caja pero no la utilidad.
      </p>
    </main>
  );
}
