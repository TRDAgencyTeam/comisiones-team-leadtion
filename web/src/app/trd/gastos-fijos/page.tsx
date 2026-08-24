import Link from "next/link";
import { soloAdmin } from "@/lib/sesion";
import { resumenGastosFijos, nominaPorArea, listarSnapshots } from "@/lib/gastos-fijos";
import { AREAS } from "@/lib/catalogos";
import { GastosDashboard } from "@/components/GastosDashboard";
import { guardarSnapshot } from "./acciones";

export const metadata = { title: "Gastos Fijos" };
export const dynamic = "force-dynamic";

const cop = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
const usd = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
const AREA_LABEL: Record<string, string> = Object.fromEntries(AREAS.map((a) => [a.value, a.label]));

export default async function GastosFijosResumen() {
  await soloAdmin();
  const [r, porArea, snapshots] = await Promise.all([resumenGastosFijos(), nominaPorArea(), listarSnapshots()]);

  const categorias = [
    { label: "Nómina", cop: r.nomina },
    { label: "Servicios públicos", cop: r.porCategoria.servicio_publico },
    { label: "Otros fijos", cop: r.porCategoria.otro },
    { label: "Herramientas", cop: r.porCategoria.herramienta },
    { label: "Hosting", cop: r.porCategoria.hosting },
    { label: "Crédito", cop: r.credito },
  ].filter((c) => c.cop > 0).sort((a, b) => b.cop - a.cop);

  const departamentos = porArea.map((d) => ({ label: AREA_LABEL[d.area] ?? d.area, cop: d.cop }));

  return (
    <main className="wrap">
      <div className="reg-head">
        <div>
          <h1>Gastos Fijos — Resumen</h1>
          <p className="sub">Total mensual que alimenta el resumen del mes. Tasa USD→COP {cop(r.tasa)}.</p>
        </div>
        <form action={guardarSnapshot}>
          <button type="submit" className="btn-secondary">Guardar mes actual al histórico</button>
        </form>
      </div>

      <div className="reg-totales">
        <div className="kpi destacado">
          <span className="kpi-lbl">Total gastos fijos / mes</span>
          <span className="kpi-num">{cop(r.totalCop)}</span>
          <span className="kpi-lbl" style={{ marginTop: 4 }}>≈ {usd(r.totalUsd)}</span>
        </div>
        <div className="kpi"><span className="kpi-lbl">Nómina</span><span className="kpi-num">{cop(r.nomina)}</span></div>
        <div className="kpi"><span className="kpi-lbl">Herramientas + hosting</span><span className="kpi-num">{cop(r.porCategoria.herramienta + r.porCategoria.hosting)}</span></div>
        <div className="kpi"><span className="kpi-lbl">Servicios + otros + crédito</span><span className="kpi-num">{cop(r.porCategoria.servicio_publico + r.porCategoria.otro + r.credito)}</span></div>
      </div>

      <GastosDashboard categorias={categorias} departamentos={departamentos} snapshots={snapshots} tasa={r.tasa} />

      <div className="reg-tabla-wrap" style={{ marginTop: 18 }}>
        <table className="reg-tabla">
          <thead><tr><th>Concepto</th><th className="right">COP / mes</th><th></th></tr></thead>
          <tbody>
            {[
              { l: "Nómina", v: r.nomina, link: "/trd/gastos-fijos/nomina" },
              { l: "Servicios públicos", v: r.porCategoria.servicio_publico, link: "/trd/gastos-fijos/gastos" },
              { l: "Otros fijos", v: r.porCategoria.otro, link: "/trd/gastos-fijos/gastos" },
              { l: "Herramientas", v: r.porCategoria.herramienta, link: "/trd/gastos-fijos/herramientas" },
              { l: "Hosting", v: r.porCategoria.hosting, link: "/trd/gastos-fijos/herramientas" },
              { l: "Crédito (cuotas)", v: r.credito, link: "/trd/gastos-fijos/credito" },
            ].map((f) => (
              <tr key={f.l}><td>{f.l}</td><td className="right">{cop(f.v)}</td>
                <td><Link href={f.link} className="link-ver">Gestionar →</Link></td></tr>
            ))}
            <tr className="fila-total"><td><strong>Total</strong></td><td className="right"><strong>{cop(r.totalCop)}</strong></td><td></td></tr>
          </tbody>
        </table>
      </div>

      {r.pasoDinero > 0 && (
        <p className="reg-nota">Paso de dinero (no cuenta como gasto): {cop(r.pasoDinero)} / mes.</p>
      )}
    </main>
  );
}
