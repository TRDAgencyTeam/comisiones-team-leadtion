import { soloAdmin } from "@/lib/sesion";
import { consulta } from "@/lib/db";
import { primerDiaMes } from "@/lib/facturacion";
import { resumenDelMes, tendenciaMensual } from "@/lib/egresos";
import { ClientesHeader } from "@/components/ClientesHeader";
import { TendenciaChart } from "@/components/TendenciaChart";
import { DonutChart } from "@/components/DonutChart";

export const metadata = { title: "Resumen del mes" };
export const dynamic = "force-dynamic";

const usd = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const usd2 = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
const mesISO = () => { const h = new Date(); return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}`; };

function delta(actual: number, previo: number): { txt: string; dn: boolean } | null {
  if (!previo || previo <= 0) return null;
  const p = Math.round(((actual - previo) / previo) * 100);
  return { txt: `${p >= 0 ? "▲" : "▼"} ${Math.abs(p)}%`, dn: p < 0 };
}

export default async function ResumenPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  await soloAdmin();
  const sp = await searchParams;
  const mes = sp.mes && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : mesISO();

  const [r, tendencia, cnt] = await Promise.all([
    resumenDelMes(mes),
    tendenciaMensual(mes, 8),
    consulta(
      `select count(*) filter (where recurrente) rec, count(*) filter (where not recurrente) mom
         from public.factura_mensual where mes = $1 and estado <> 'anulado'`,
      [primerDiaMes(mes)],
    ),
  ]);
  const rec = Number(cnt[0]?.rec ?? 0), mom = Number(cnt[0]?.mom ?? 0);
  const prev = tendencia.length >= 2 ? tendencia[tendencia.length - 2]! : null;
  const dIng = prev ? delta(r.ingresos.total, prev.ingresos) : null;
  const dNeta = prev ? delta(r.utilidadNeta, prev.neta) : null;

  return (
    <main className="cf">
      <ClientesHeader mes={mes} activo="resumen" tasa={r.tasa} />

      <div className="cf-kpis">
        <div className="cf-kpi hero">
          <div className="lbl">Total ingresos del mes</div>
          <div className="big">{usd(r.ingresos.total)}</div>
          <div className="sub">USD · {new Intl.NumberFormat("es-CO", { notation: "compact", maximumFractionDigits: 1 }).format(r.ingresos.total * r.tasa)} COP</div>
          {dIng && <div className="cf-delta">{dIng.txt} vs. mes anterior</div>}
        </div>
        <div className="cf-kpi"><div className="lbl">Utilidad bruta del mes</div><div className="big">{usd(r.utilidadBruta)}</div><div className="sub">ingresos − gastos</div></div>
        <div className="cf-kpi"><div className="lbl">Utilidad neta</div><div className="big">{usd(r.utilidadNeta)}</div><div className="sub">{r.margen}% de margen</div>{dNeta && <div className={`cf-delta${dNeta.dn ? " dn" : ""}`}>{dNeta.txt}</div>}</div>
        <div className="cf-kpi"><div className="lbl">Clientes activos</div><div className="big">{rec + mom}</div><div className="sub">{rec} recurrentes · {mom} del momento</div></div>
      </div>

      <div className="cf-charts">
        <div className="cf-card">
          <h3>Tendencia de ingresos <span className="cf-legend"><i style={{ display: "inline-block", width: 9, height: 9, borderRadius: 3, background: "#6d5ac0" }} /> pasa el cursor</span></h3>
          <TendenciaChart datos={tendencia} />
        </div>
        <div className="cf-card"><h3>Ingresos por fuente</h3><DonutChart fuentes={r.ingresos.porFuente} total={r.ingresos.total} /></div>
      </div>

      <div className="cf-ie">
        <div className="cf-card">
          <h3>Ingresos</h3>
          <div className="cf-li"><span>Clientes USA (LLC)</span><b>{usd2(r.ingresos.clientesUsa)}</b></div>
          <div className="cf-li"><span>Clientes Colombia</span><b>{usd2(r.ingresos.clientesCol)}</b></div>
          {r.ingresos.otros.map((o) => (<div key={o.id} className="cf-li"><span>{o.concepto}</span><b>{usd2(o.valorUsd)}</b></div>))}
          <div className="cf-li tot"><span>Total ingresos</span><b>{usd2(r.ingresos.total)}</b></div>
        </div>
        <div className="cf-card">
          <h3>Gastos (afectan la utilidad)</h3>
          {r.egresos.afectanUtilidad.map((e) => (<div key={e.id} className="cf-li"><span>{e.concepto}</span><b>{usd2(e.valorUsd)}</b></div>))}
          {r.egresos.afectanUtilidad.length === 0 && <div className="cf-li"><span>Sin gastos registrados</span><b>—</b></div>}
          <div className="cf-li tot"><span>Total gastos</span><b>{usd2(r.egresos.totalAfectan)}</b></div>
        </div>
      </div>

      <div className="cf-util-strip">
        <div className="cf-util"><div className="lbl">Utilidad bruta</div><div className="v">{usd2(r.utilidadBruta)}</div></div>
        <div className="cf-util"><div className="lbl">Diezmo (10%)</div><div className="v">−{usd2(r.diezmo)}</div></div>
        <div className="cf-util net"><div className="lbl">Utilidad neta</div><div className="v">{usd2(r.utilidadNeta)}</div></div>
      </div>

      <p className="cf-nota">El diezmo (10% de la utilidad) es automático y sale de caja. Los egresos que “salen de caja” no bajan la utilidad del mes; los ves en la pestaña Egresos.</p>
    </main>
  );
}
