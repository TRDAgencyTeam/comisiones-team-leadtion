import { soloAdmin } from "@/lib/sesion";
import { flujoCaja } from "@/lib/egresos";
import { tasaUsdCop } from "@/lib/fx";
import { ClientesHeader } from "@/components/ClientesHeader";

export const metadata = { title: "Caja" };
export const dynamic = "force-dynamic";

const usd = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const usd2 = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
const mesISO = () => { const h = new Date(); return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}`; };
const nombreMes = (iso: string) => { const [a, m] = iso.split("-").map(Number); const s = new Date(a!, m! - 1, 1).toLocaleDateString("es-CO", { month: "short", year: "2-digit" }); return s.charAt(0).toUpperCase() + s.slice(1); };
const cls = (n: number) => (n < 0 ? "neg" : "pos");

export default async function CajaPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  await soloAdmin();
  const sp = await searchParams;
  const mes = sp.mes && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : mesISO();
  const [flujo, fx] = await Promise.all([flujoCaja(mes), tasaUsdCop()]);

  return (
    <main className="cf">
      <ClientesHeader mes={mes} activo="caja" tasa={fx.cop} titulo="Caja LLC" />
      <p className="cf-hint" style={{ margin: "0 0 4px" }}>La utilidad de cada mes suma a la caja; las inversiones y gastos de caja (y el diezmo) la consumen. No incluye Elite Agent Club Skool.</p>

      <div className="cf-kpis" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="cf-kpi"><div className="lbl">Utilidad acumulada (desde enero)</div><div className="big">{usd(flujo.utilAcum)}</div><div className="sub">suma de utilidades del mes</div></div>
        <div className="cf-kpi"><div className="lbl">Salidas de caja acumuladas</div><div className="big">{usd(flujo.salidasAcum)}</div><div className="sub">inversiones + diezmo</div></div>
        <div className={`cf-kpi ${flujo.cajaDisponible < 0 ? "" : "hero"}`}><div className="lbl">Caja disponible</div><div className="big">{usd(flujo.cajaDisponible)}</div><div className="sub">utilidad acum. − salidas acum.</div></div>
      </div>

      <div className="cf-sec-head"><h2>Mes a mes</h2></div>
      <div className="cf-table-wrap">
        <table className="cf-table">
          <thead><tr><th>Mes</th><th className="r">Utilidad del mes</th><th className="r">Salidas de caja</th><th className="r">Caja del mes</th><th className="r">Caja acumulada</th></tr></thead>
          <tbody>
            {flujo.filas.map((f) => (
              <tr key={f.mes} className={f.mes === mes ? "fila-por_confirmar" : ""}>
                <td className="nom">{nombreMes(f.mes)}</td>
                <td className="r"><span className={`cf-caja-${cls(f.utilidad)}`}>{usd2(f.utilidad)}</span></td>
                <td className="r">−{usd2(f.salidas)}</td>
                <td className="r"><span className={`cf-caja-${cls(f.cajaMes)}`}>{usd2(f.cajaMes)}</span></td>
                <td className="r neto"><span className={`cf-caja-${cls(f.acumulada)}`}>{usd2(f.acumulada)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="cf-nota">
        <b>Caja disponible = Σ utilidad − Σ salidas de caja.</b> En meses de pérdida (utilidad negativa) igual pueden salir inversiones de caja, así que la caja baja aunque el mes no haya sido rentable.
        Las salidas de caja se cargan en <b>Egresos → “Sale de caja”</b>; el diezmo (10%) es automático.
      </p>
    </main>
  );
}
