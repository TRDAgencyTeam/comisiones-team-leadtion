import Link from "next/link";
import { soloAdmin } from "@/lib/sesion";
import { tasaUsdCop } from "@/lib/fx";
import { listarGastos, periodos, RECURRENCIA_LABEL } from "@/lib/gastos-fijos";
import { eliminarGasto } from "../gastos/acciones";

export const metadata = { title: "Herramientas" };
export const dynamic = "force-dynamic";

const cop = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
const usd = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);

export default async function HerramientasPage() {
  await soloAdmin();
  const [gastos, fx] = await Promise.all([listarGastos(), tasaUsdCop()]);
  const items = gastos.filter((g) => g.categoria === "herramienta" || g.categoria === "hosting");

  let totMesUsd = 0, totMesCop = 0, totAnualUsd = 0;
  const filas = items.map((g) => {
    const p = periodos(g, fx.cop);
    totMesUsd += p.mesUsd; totMesCop += p.mesCop; totAnualUsd += p.anualUsd;
    return { g, p };
  });

  return (
    <main className="wrap">
      <div className="reg-head">
        <div>
          <h1>Herramientas y hosting</h1>
          <p className="sub">{items.length} suscripciones · tasa {cop(fx.cop)}. Total mensual {usd(totMesUsd)} ≈ {cop(totMesCop)}.</p>
        </div>
        <Link href="/trd/gastos-fijos/gastos/nuevo" className="btn-primary">+ Agregar</Link>
      </div>

      <div className="reg-totales">
        <div className="kpi destacado"><span className="kpi-lbl">Mensual</span><span className="kpi-num">{usd(totMesUsd)}</span><span className="kpi-lbl">{cop(totMesCop)}</span></div>
        <div className="kpi"><span className="kpi-lbl">Anual</span><span className="kpi-num">{usd(totAnualUsd)}</span></div>
        <div className="kpi"><span className="kpi-lbl">Diario</span><span className="kpi-num">{usd(totMesUsd / 30)}</span></div>
      </div>

      <div className="reg-tabla-wrap">
        <table className="reg-tabla">
          <thead>
            <tr>
              <th>Herramienta</th><th>Cada cuánto</th><th>Método</th>
              <th className="right">Diario</th><th className="right">Mensual</th><th className="right">Anual</th>
              <th className="right">Mensual COP</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filas.map(({ g, p }) => (
              <tr key={g.id} className={g.activo ? "" : "fila-inactiva"}>
                <td>
                  <Link href={`/trd/gastos-fijos/gastos/${g.id}`} className="link-ver">{g.nombre}</Link>
                  {g.categoria === "hosting" && <span className="freelance-tag" style={{ marginLeft: 6 }}>hosting</span>}
                </td>
                <td className="muted">{RECURRENCIA_LABEL[g.recurrencia]}{g.diaCobro ? ` · día ${g.diaCobro}` : ""}</td>
                <td className="muted">{g.metodoPago ?? "—"}</td>
                <td className="right">{usd(p.diaUsd)}</td>
                <td className="right">{usd(p.mesUsd)}</td>
                <td className="right">{usd(p.anualUsd)}</td>
                <td className="right strong">{cop(p.mesCop)}</td>
                <td>
                  <form action={eliminarGasto}>
                    <input type="hidden" name="id" value={g.id} />
                    <button type="submit" className="btn-borrar" title="Eliminar">🗑️</button>
                  </form>
                </td>
              </tr>
            ))}
            <tr className="fila-total">
              <td colSpan={3}><strong>Total</strong></td>
              <td className="right"><strong>{usd(totMesUsd / 30)}</strong></td>
              <td className="right"><strong>{usd(totMesUsd)}</strong></td>
              <td className="right"><strong>{usd(totAnualUsd)}</strong></td>
              <td className="right"><strong>{cop(totMesCop)}</strong></td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  );
}
