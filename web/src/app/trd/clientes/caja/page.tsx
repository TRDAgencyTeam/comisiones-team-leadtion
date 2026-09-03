import { soloAdmin } from "@/lib/sesion";
import { flujoCaja } from "@/lib/egresos";
import { tasaUsdCop } from "@/lib/fx";
import { ClientesHeader } from "@/components/ClientesHeader";

export const metadata = { title: "Caja" };
export const dynamic = "force-dynamic";

const usd = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const mesISO = () => { const h = new Date(); return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}`; };
const nombreMes = (iso: string) => { const [a, m] = iso.split("-").map(Number); const s = new Date(a!, m! - 1, 1).toLocaleDateString("es-CO", { month: "long", year: "numeric" }); return s.charAt(0).toUpperCase() + s.slice(1); };

export default async function CajaPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  await soloAdmin();
  const sp = await searchParams;
  const mes = sp.mes && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : mesISO();
  const [flujo, fx] = await Promise.all([flujoCaja(mes), tasaUsdCop()]);

  return (
    <main className="cf">
      <ClientesHeader mes={mes} activo="caja" tasa={fx.cop} titulo="Caja LLC" />
      <p className="cf-hint" style={{ margin: "0 0 6px" }}>Lo que <b>ganas</b> cada mes (utilidad) entra a la caja; lo que <b>inviertes/gastas</b> de la caja sale. Lo que queda es la <b>caja disponible</b>. (No incluye Elite Agent Club Skool.)</p>

      <div className="cf-kpis" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="cf-kpi"><div className="lbl">Utilidad acumulada (desde enero)</div><div className="big">{usd(flujo.utilAcum)}</div><div className="sub">todo lo que entró a caja</div></div>
        <div className="cf-kpi"><div className="lbl">Invertido / gastado de caja</div><div className="big">{usd(flujo.invAcum)}</div><div className="sub">todo lo que salió de caja</div></div>
        <div className="cf-kpi hero"><div className="lbl">Caja disponible</div><div className="big">{usd(flujo.cajaDisponible)}</div><div className="sub">lo que queda hoy</div></div>
      </div>

      <div className="cf-sec-head"><h2>Mes a mes</h2></div>
      <div className="cf-table-wrap">
        <table className="cf-table">
          <thead><tr><th>Mes</th><th className="r">Ingresos</th><th className="r">Egresos</th><th className="r">Utilidad</th><th className="r">Invertido de caja</th></tr></thead>
          <tbody>
            {flujo.filas.map((f) => (
              <tr key={f.mes} className={f.mes === mes ? "fila-por_confirmar" : ""}>
                <td className="nom">{nombreMes(f.mes)}</td>
                <td className="r">{usd(f.ingresos)}</td>
                <td className="r">{usd(f.egresos)}</td>
                <td className="r"><span className={f.utilidad < 0 ? "cf-caja-neg" : "cf-caja-pos"}>{usd(f.utilidad)}</span></td>
                <td className="r">{f.inversiones ? usd(f.inversiones) : "—"}</td>
              </tr>
            ))}
            <tr style={{ fontWeight: 800, borderTop: "2px solid var(--border)" }}>
              <td className="nom">Total</td>
              <td className="r">—</td>
              <td className="r">—</td>
              <td className="r"><span className={flujo.utilAcum < 0 ? "cf-caja-neg" : "cf-caja-pos"}>{usd(flujo.utilAcum)}</span></td>
              <td className="r">{usd(flujo.invAcum)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="cf-nota">
        <b>Caja disponible = utilidad acumulada − invertido de caja = {usd(flujo.utilAcum)} − {usd(flujo.invAcum)} = {usd(flujo.cajaDisponible)}.</b>
        Ojo: hubo meses en pérdida (enero, mayo) y aún así se invirtió de caja, por eso a veces se saca de donde no hay.
      </p>
    </main>
  );
}
