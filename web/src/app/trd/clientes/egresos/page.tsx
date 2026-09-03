import { soloAdmin } from "@/lib/sesion";
import { resumenDelMes, egresosDelMes, tendenciaMensual, asegurarEgresosFijosDelMes, type EgresoRow } from "@/lib/egresos";
import { ClientesHeader } from "@/components/ClientesHeader";
import { MovimientoModal } from "@/components/MovimientoModal";
import { TendenciaChart } from "@/components/TendenciaChart";
import { CostoHover } from "@/components/CostoHover";
import { eliminarEgreso } from "../acciones";

export const metadata = { title: "Egresos" };
export const dynamic = "force-dynamic";

const usd = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
const usd0 = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const cop = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
const mesISO = () => { const h = new Date(); return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}`; };
const fFecha = (iso: string | null) => { if (!iso) return "—"; const [, m, d] = iso.split("-"); return `${d}/${m}`; };

const inList = (v: string | null, arr: string[]) => arr.includes(v ?? "");
const GRUPOS: { key: string; t: string; ic: string; auto: boolean; hover?: boolean; conHora?: boolean; f: (e: EgresoRow) => boolean }[] = [
  { key: "nomina", t: "Nómina", ic: "👥", auto: true, hover: true, conHora: true, f: (e) => e.categoria === "fijo" && e.subcategoria === "nomina" },
  { key: "oper", t: "Operativos fijos", ic: "🏢", auto: true, f: (e) => e.categoria === "fijo" && inList(e.subcategoria, ["servicio_publico", "otro"]) },
  { key: "tools", t: "Herramientas & Hosting", ic: "🧰", auto: true, hover: true, f: (e) => e.categoria === "fijo" && inList(e.subcategoria, ["herramienta", "hosting"]) },
  { key: "fijohist", t: "Fijos (histórico)", ic: "📌", auto: false, f: (e) => e.categoria === "fijo" && !e.subcategoria },
  { key: "lead", t: "Operación Leadtion del mes", ic: "⚡", auto: false, f: (e) => e.afectaUtilidad && inList(e.categoria, ["comision", "api", "bono", "referido", "comision_banco"]) },
  { key: "var", t: "Gastos variables del mes", ic: "🧾", auto: false, f: (e) => e.afectaUtilidad && !inList(e.categoria, ["fijo", "comision", "api", "bono", "referido", "comision_banco"]) },
];

function Grupo({ t, ic, auto, filas, hover, conHora }: { t: string; ic: string; auto: boolean; filas: EgresoRow[]; hover?: boolean; conHora?: boolean }) {
  if (filas.length === 0) return null;
  const sub = filas.reduce((s, e) => s + e.valorUsd, 0);
  return (
    <div className="cf-egrupo">
      <div className="cf-egrupo-h">
        <span className="cf-egrupo-t"><span className="cf-egrupo-ic">{ic}</span><b>{t}</b><span className="count">({filas.length})</span></span>
        <span className="cf-egrupo-r">{auto && <span className="cf-auto">auto mensual</span>}<b className="cf-mono">{usd0(sub)}</b></span>
      </div>
      {filas.map((e) => (
        <div key={`${e.id}-${e.concepto}`} className="cf-erow">
          <span className="nom">{e.concepto}{e.marca ? <small>{e.marca}{e.fecha ? ` · ${fFecha(e.fecha)}` : ""}</small> : null}</span>
          <span className="cop">{!hover && e.valorCop != null ? cop(e.valorCop) : ""}</span>
          <span className="val">{hover ? <CostoHover mensualUsd={e.valorUsd} mensualCop={e.valorCop} conHora={conHora} /> : <span className="cf-mono">{usd(e.valorUsd)}</span>}</span>
          <span className="del">{e.automatico ? <span className="cf-hint" title="Automático">🔒 auto</span> : e.id > 0 ? <form action={eliminarEgreso}><input type="hidden" name="id" value={e.id} /><button type="submit" className="btn-borrar" title="Eliminar">🗑️</button></form> : null}</span>
        </div>
      ))}
    </div>
  );
}

export default async function EgresosPage({ searchParams }: { searchParams: Promise<{ mes?: string; error?: string }> }) {
  await soloAdmin();
  const sp = await searchParams;
  const mes = sp.mes && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : mesISO();
  await asegurarEgresosFijosDelMes(mes); // snapshot de fijos ANTES de leer el detalle
  const [r, egresos, tendencia] = await Promise.all([resumenDelMes(mes), egresosDelMes(mes), tendenciaMensual(mes, 8)]);
  const totalEgresos = r.egresos.totalAfectan + r.egresos.totalCaja;
  const tendEgresos = tendencia.map((t) => ({ mes: t.mes, ingresos: t.egresosTotal, neta: t.egresosUtilidad }));
  const caja = r.egresos.saleDeCaja; // incluye diezmo automático

  return (
    <main className="cf">
      <ClientesHeader mes={mes} activo="egresos" tasa={r.tasa} />
      {sp.error && <p className="alerta">{decodeURIComponent(sp.error)}</p>}

      <div className="cf-kpis" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="cf-kpi hero"><div className="lbl">Egresos totales del mes</div><div className="big">{usd0(totalEgresos)}</div><div className="sub">utilidad + caja</div></div>
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
          {r.egresos.afectanUtilidad.slice().sort((a, b) => b.valorUsd - a.valorUsd).slice(0, 7).map((e) => {
            const pct = r.egresos.totalAfectan > 0 ? (e.valorUsd / r.egresos.totalAfectan) * 100 : 0;
            return (
              <div key={e.id} style={{ margin: "9px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", marginBottom: 3 }}><span style={{ color: "var(--muted)" }}>{e.concepto}</span><b>{pct.toFixed(1)}%</b></div>
                <div style={{ height: 6, borderRadius: 999, background: "var(--bg)", overflow: "hidden" }}><div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg,#2e2a6e,#6d5ac0)" }} /></div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="cf-sec-head">
        <h2>Egresos por categoría</h2>
        <MovimientoModal mes={mes} tipo="egreso" />
      </div>
      {GRUPOS.map((g) => <Grupo key={g.key} t={g.t} ic={g.ic} auto={g.auto} hover={g.hover} conHora={g.conHora} filas={egresos.filter(g.f)} />)}
      <Grupo t="Sale de caja" ic="🏦" auto={false} filas={caja} />

      <p className="cf-nota">
        Los grupos <b>“auto mensual”</b> (nómina, operativos, herramientas) se snapshotean del módulo Gastos Fijos y se repiten cada mes; edítalos aquí para el mes (agregar/quitar) sin tocar los meses pasados.
        El resto lo agregas con <b>“+ Agregar egreso”</b> eligiendo el grupo. El <b>diezmo</b> es automático (10% de la utilidad, sale de caja).
      </p>
    </main>
  );
}
