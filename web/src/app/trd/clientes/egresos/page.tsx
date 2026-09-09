import Link from "next/link";
import { soloAdmin } from "@/lib/sesion";
import { resumenDelMes, egresosDelMes, tendenciaMensual, asegurarEgresosFijosDelMes, type EgresoRow } from "@/lib/egresos";
import { AREAS } from "@/lib/catalogos";
import { listarCreditos, cuotasRestantes } from "@/lib/credito";
import { ClientesHeader } from "@/components/ClientesHeader";
import { MovimientoModal } from "@/components/MovimientoModal";
import { TendenciaChart } from "@/components/TendenciaChart";
import { EgresosCards } from "@/components/EgresosCards";
import { CreditoForm } from "@/components/CreditoForm";
import { eliminarEgreso } from "../acciones";
import { actualizarCredito } from "@/app/trd/gastos-fijos/credito/acciones";

export const metadata = { title: "Egresos" };
export const dynamic = "force-dynamic";

const usd = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
const usd0 = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const cop = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
const mesISO = () => { const h = new Date(); return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}`; };
const fFecha = (iso: string | null) => { if (!iso) return "—"; const [, m, d] = iso.split("-"); return `${d}/${m}`; };
const AREA_LABEL: Record<string, string> = Object.fromEntries(AREAS.map((a) => [a.value, a.label]));

const inList = (v: string | null, arr: string[]) => arr.includes(v ?? "");
type GrupoDef = { key: string; t: string; ic: string; edit: boolean; add?: string; gestion?: { href: string; label: string }; f: (e: EgresoRow) => boolean };
const GRUPOS: GrupoDef[] = [
  { key: "nomina", t: "Nómina", ic: "👥", edit: false, gestion: { href: "/trd/gastos-fijos/nomina", label: "Gestionar en Nómina" }, f: (e) => e.categoria === "fijo" && e.subcategoria === "nomina" },
  { key: "oper", t: "Operativos fijos", ic: "🏢", edit: false, gestion: { href: "/trd/gastos-fijos/gastos", label: "Gestionar en Operativos" }, f: (e) => e.categoria === "fijo" && inList(e.subcategoria, ["servicio_publico", "otro"]) },
  { key: "tools", t: "Herramientas & Hosting", ic: "🧰", edit: false, gestion: { href: "/trd/gastos-fijos/herramientas", label: "Gestionar en Herramientas" }, f: (e) => e.categoria === "fijo" && inList(e.subcategoria, ["herramienta", "hosting"]) },
  { key: "fijohist", t: "Fijos (histórico)", ic: "📌", edit: false, f: (e) => e.categoria === "fijo" && !e.subcategoria },
  { key: "lead", t: "Operación Leadtion del mes", ic: "⚡", edit: false, f: (e) => e.afectaUtilidad && inList(e.categoria, ["comision", "api", "bono", "referido", "comision_banco"]) },
  { key: "var", t: "Gastos variables del mes", ic: "🧾", edit: true, add: "variable", f: (e) => e.afectaUtilidad && !inList(e.categoria, ["fijo", "comision", "api", "bono", "referido", "comision_banco"]) },
];

function Grupo({ t, ic, filas, mes, edit, add, gestion }: {
  t: string; ic: string; filas: EgresoRow[]; mes: string; edit: boolean; add?: string; gestion?: { href: string; label: string };
}) {
  if (filas.length === 0 && !edit) return null;
  const sub = filas.reduce((s, e) => s + e.valorUsd, 0);
  return (
    <div className="cf-egrupo">
      <div className="cf-egrupo-h">
        <span className="cf-egrupo-t"><span className="cf-egrupo-ic">{ic}</span><b>{t}</b><span className="count">({filas.length})</span></span>
        <span className="cf-egrupo-r">
          {!edit && <span className="cf-auto">auto mensual</span>}
          {edit && add && <MovimientoModal mes={mes} tipo="egreso" grupoInicial={add} compact />}
          {gestion && <Link href={gestion.href} className="cf-gestion">{gestion.label} →</Link>}
          <b className="cf-mono">{usd0(sub)}</b>
        </span>
      </div>
      {filas.length === 0 && edit && <div className="cf-erow"><span className="nom" style={{ color: "var(--faint)" }}>Sin gastos este mes.</span><span></span><span></span><span></span></div>}
      {filas.map((e) => (
        <div key={`${e.id}-${e.concepto}`} className="cf-erow">
          <span className="nom">{e.concepto}{e.marca ? <small>{e.marca}{e.fecha ? ` · ${fFecha(e.fecha)}` : ""}</small> : null}</span>
          <span className="cop">{e.valorCop != null ? cop(e.valorCop) : ""}</span>
          <span className="val"><span className="cf-mono">{usd(e.valorUsd)}</span></span>
          <span className="del">{
            edit && !e.automatico && e.id > 0
              ? <span className="cf-acc-btns">
                  <MovimientoModal mes={mes} tipo="egreso" editarEgresoData={{ id: e.id, concepto: e.concepto, marca: e.marca, valorUsd: e.valorUsd, valorCop: e.valorCop }} />
                  <form action={eliminarEgreso}><input type="hidden" name="id" value={e.id} /><button type="submit" className="btn-borrar" title="Eliminar">🗑️</button></form>
                </span>
              : e.automatico ? <span className="cf-hint" title="Automático">🔒</span> : null
          }</span>
        </div>
      ))}
    </div>
  );
}

async function VistaCredito() {
  const creditos = await listarCreditos();
  return (
    <>
      {creditos.length === 0 && <p className="cf-nota">No hay créditos registrados.</p>}
      {creditos.map((c) => {
        const nc = cuotasRestantes(c.saldo, c.cuota, c.tasaEa);
        const capital = Math.max(0, c.cuota - c.interesCorriente);
        return (
          <div key={c.id} className="cf-card" style={{ marginBottom: 16 }}>
            <div className="cf-sec-head"><h2 style={{ margin: 0 }}>{c.nombre} <span className="cf-legend">tasa {c.tasaEa}% E.A. · paga {c.diaPago}</span></h2></div>
            <div className="cf-kpis" style={{ gridTemplateColumns: "repeat(4,1fr)", marginTop: 10 }}>
              <div className="cf-kpi"><div className="lbl">Saldo</div><div className="big">{cop(c.saldo)}</div></div>
              <div className="cf-kpi"><div className="lbl">Cuota</div><div className="big">{cop(c.cuota)}</div></div>
              <div className="cf-kpi"><div className="lbl">Interés / capital</div><div className="big" style={{ fontSize: "1rem" }}>{cop(c.interesCorriente)} / {cop(capital)}</div></div>
              <div className="cf-kpi"><div className="lbl">Cuotas restantes</div><div className="big">{nc ?? "—"}</div></div>
            </div>
            <CreditoForm action={actualizarCredito} credito={c} />
          </div>
        );
      })}
    </>
  );
}

export default async function EgresosPage({ searchParams }: { searchParams: Promise<{ mes?: string; tab?: string; error?: string }> }) {
  await soloAdmin();
  const sp = await searchParams;
  const mes = sp.mes && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : mesISO();
  const tab = sp.tab === "credito" ? "credito" : "resumen";
  await asegurarEgresosFijosDelMes(mes);
  const [r, egresos, tendencia] = await Promise.all([resumenDelMes(mes), egresosDelMes(mes), tendenciaMensual(mes, 8)]);
  const totalEgresos = r.egresos.totalAfectan + r.cajaOficial;
  const tendEgresos = tendencia.map((t) => ({ mes: t.mes, ingresos: t.egresosTotal, neta: t.egresosUtilidad }));
  const caja = r.egresos.saleDeCaja;

  // Datos para las tarjetas visuales (del mes en curso).
  const categorias = GRUPOS.map((g) => ({ label: g.t, usd: egresos.filter(g.f).reduce((s, e) => s + e.valorUsd, 0) })).filter((c) => c.usd > 0);
  const depMap = new Map<string, number>();
  for (const e of egresos.filter((x) => x.categoria === "fijo" && x.subcategoria === "nomina")) {
    const k = AREA_LABEL[e.marca ?? ""] ?? e.marca ?? "Equipo";
    depMap.set(k, (depMap.get(k) ?? 0) + e.valorUsd);
  }
  const departamentos = [...depMap.entries()].map(([label, u]) => ({ label, usd: u })).sort((a, b) => b.usd - a.usd);

  return (
    <main className="cf">
      <ClientesHeader mes={mes} activo="egresos" tasa={r.tasa} />
      {sp.error && <p className="alerta">{decodeURIComponent(sp.error)}</p>}

      <nav className="cf-subtabs">
        <Link href={`/trd/clientes/egresos?mes=${mes}`} className={`cf-subtab${tab === "resumen" ? " on" : ""}`}>Resumen</Link>
        <Link href={`/trd/clientes/egresos?mes=${mes}&tab=credito`} className={`cf-subtab${tab === "credito" ? " on" : ""}`}>Crédito</Link>
      </nav>

      {tab === "credito" ? <VistaCredito /> : (
        <>
          <div className="cf-kpis" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            <div className="cf-kpi hero"><div className="lbl">Egresos totales del mes</div><div className="big">{usd0(totalEgresos)}</div><div className="sub">utilidad + caja</div></div>
            <div className="cf-kpi"><div className="lbl">Egresos de utilidad</div><div className="big">{usd0(r.egresos.totalAfectan)}</div><div className="sub">bajan la utilidad del mes</div></div>
            <div className="cf-kpi"><div className="lbl">Sale de caja</div><div className="big">{usd0(r.cajaOficial)}</div><div className="sub">incluye diezmo {usd0(r.diezmo)}</div></div>
          </div>

          <div className="cf-card" style={{ marginTop: 14 }}>
            <h3>Tendencia de egresos <span className="cf-legend"><i style={{ display: "inline-block", width: 9, height: 9, borderRadius: 3, background: "#e0653a" }} /> totales por mes · pasa el cursor</span></h3>
            <TendenciaChart datos={tendEgresos} color="#e0653a" secundarioLabel="de utilidad" />
          </div>

          <EgresosCards categorias={categorias} departamentos={departamentos} tasa={r.tasa} />

          <div className="cf-sec-head" style={{ marginTop: 18 }}>
            <h2>Egresos por categoría</h2>
            <MovimientoModal mes={mes} tipo="egreso" />
          </div>
          {GRUPOS.map((g) => (
            <Grupo key={g.key} t={g.t} ic={g.ic} filas={egresos.filter(g.f)} mes={mes} edit={g.edit} add={g.add} gestion={g.gestion} />
          ))}
          <Grupo t="Sale de caja" ic="🏦" filas={caja} mes={mes} edit add="caja" />

          <p className="cf-nota">
            <b>Nómina, Herramientas y Operativos</b> se editan en su propia pestaña del menú (aquí se ven en resumen).
            En Egresos solo agregas/quitas <b>gastos variables</b> y <b>salidas de caja</b> del mes. El <b>diezmo</b> es automático (10% de la utilidad).
          </p>
        </>
      )}
    </main>
  );
}
