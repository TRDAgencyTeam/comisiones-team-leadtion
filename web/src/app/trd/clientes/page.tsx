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

const enLista = (v: string | null, arr: string[]) => arr.includes(v ?? "");
/** Agrupa los gastos que afectan la utilidad por categoría (resumen, no fila a fila). */
function agruparGastos(filas: { categoria: string | null; subcategoria: string | null; valorUsd: number }[]) {
  const g: Record<string, { label: string; total: number; count: number; unidad: string }> = {
    nomina: { label: "Nómina", total: 0, count: 0, unidad: "personas" },
    oper: { label: "Operativos fijos", total: 0, count: 0, unidad: "conceptos" },
    tools: { label: "Herramientas & Hosting", total: 0, count: 0, unidad: "herramientas" },
    fijo: { label: "Gastos fijos", total: 0, count: 0, unidad: "conceptos" },
    lead: { label: "Operación Leadtion", total: 0, count: 0, unidad: "conceptos" },
    var: { label: "Gastos variables del mes", total: 0, count: 0, unidad: "conceptos" },
  };
  for (const e of filas) {
    let k: string;
    if (e.categoria === "fijo" && e.subcategoria === "nomina") k = "nomina";
    else if (e.categoria === "fijo" && enLista(e.subcategoria, ["servicio_publico", "otro"])) k = "oper";
    else if (e.categoria === "fijo" && enLista(e.subcategoria, ["herramienta", "hosting"])) k = "tools";
    else if (e.categoria === "fijo") k = "fijo";
    else if (enLista(e.categoria, ["comision", "api", "bono", "referido", "comision_banco"])) k = "lead";
    else k = "var";
    g[k]!.total += e.valorUsd; g[k]!.count += 1;
  }
  return Object.values(g).filter((x) => x.count > 0);
}

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
  const gruposGasto = agruparGastos(r.egresos.afectanUtilidad);
  const egresosTotales = r.egresos.totalAfectan + r.egresos.totalCaja;

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
        <div className="cf-kpi"><div className="lbl">Egresos totales del mes</div><div className="big">{usd(egresosTotales)}</div><div className="sub">afectan utilidad {usd(r.egresos.totalAfectan)} · caja {usd(r.egresos.totalCaja)}</div></div>
        <div className="cf-kpi"><div className="lbl">Utilidad neta</div><div className="big">{usd(r.utilidadNeta)}</div><div className="sub">bruta {usd(r.utilidadBruta)} · {r.margen}% margen</div>{dNeta && <div className={`cf-delta${dNeta.dn ? " dn" : ""}`}>{dNeta.txt}</div>}</div>
        <div className="cf-kpi"><div className="lbl">Clientes activos</div><div className="big">{rec + mom}</div><div className="sub" style={{ display: "flex", gap: 6, marginTop: 6 }}><span className="cf-chip llc">{rec} recurrentes</span><span className="cf-chip col">{mom} del momento</span></div></div>
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
          <h3>Gastos por categoría <span className="cf-legend">(afectan la utilidad)</span></h3>
          {gruposGasto.map((g) => (
            <div key={g.label} className="cf-li">
              <span>{g.label} {g.label === "Nómina" || g.label === "Herramientas & Hosting" ? <small style={{ color: "var(--faint)" }}>· {g.count} {g.unidad}</small> : null}</span>
              <b>{usd2(g.total)}</b>
            </div>
          ))}
          {gruposGasto.length === 0 && <div className="cf-li"><span>Sin gastos registrados</span><b>—</b></div>}
          <div className="cf-li tot"><span>Total que afecta utilidad</span><b>{usd2(r.egresos.totalAfectan)}</b></div>
          <div className="cf-li"><span>+ Sale de caja (inversiones, diezmo)</span><b>{usd2(r.egresos.totalCaja)}</b></div>
          <div className="cf-li tot"><span>Egresos totales del mes</span><b>{usd2(egresosTotales)}</b></div>
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
