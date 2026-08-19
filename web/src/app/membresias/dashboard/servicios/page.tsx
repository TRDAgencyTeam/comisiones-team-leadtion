import Link from "next/link";
import { calcularPnL } from "@/lib/pnl";
import { SERVICIO_LABEL } from "@/lib/servicios";

export const dynamic = "force-dynamic";

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const mesLargo = (m: string) => { const [y, mm] = m.split("-").map(Number); return `${MESES[(mm ?? 1) - 1]} ${y}`; };

export default async function ServiciosDelMesPage() {
  let pnl = null, error: string | null = null;
  try { pnl = await calcularPnL(); } catch (e) { error = e instanceof Error ? e.message : String(e); }
  const detalle = pnl?.ingresos.servicios.detalle ?? [];

  return (
    <main className="wrap">
      <p className="volver"><Link href="/membresias/dashboard">← Dashboard</Link></p>
      <header className="page">
        <h1>Servicios Leadtion {pnl ? `de ${mesLargo(pnl.mes)}` : ""}</h1>
        <p>Clientes que generan ingreso por servicio este mes y cuánto aporta cada uno.</p>
      </header>

      {error && <div className="card"><strong>No se pudo cargar.</strong><p className="empty">{error}</p></div>}

      {pnl && (
        <section className="card">
          <div className="card-head">
            <span className="who">{detalle.length} servicio{detalle.length === 1 ? "" : "s"} este mes</span>
            <span className="total">{usd(pnl.ingresos.servicios.total)}</span>
          </div>
          {detalle.length === 0 ? (
            <p className="empty">Ningún servicio aporta ingreso este mes.</p>
          ) : (
            <div className="table-scroll">
              <table>
                <thead><tr><th>#</th><th>Cliente</th><th>Servicio</th><th className="num">Aporte del mes</th></tr></thead>
                <tbody>
                  {detalle.map((d, i) => (
                    <tr key={`${d.nombre}-${d.tipo}-${i}`}>
                      <td className="td-sub">{i + 1}</td>
                      <td>{d.nombre}</td>
                      <td className="td-concepto">{SERVICIO_LABEL[d.tipo as keyof typeof SERVICIO_LABEL] ?? d.tipo}</td>
                      <td className="num">{usd(d.monto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="foot" style={{ marginTop: 8 }}>
            El aporte es lo que cada servicio genera este mes según su dinámica (mes 1/2/3).
            Un mismo cliente puede aparecer con más de un servicio.
          </p>
        </section>
      )}
    </main>
  );
}
