import Link from "next/link";
import { dashboardAfiliados } from "@/lib/afiliados";

export const dynamic = "force-dynamic";

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
function mesLargo(mesISO: string) { const [y,m] = mesISO.split("-").map(Number); return `${MESES[(m??1)-1]} ${y}`; }

export default async function AfiliadosDashboard() {
  let dash = null, error: string | null = null;
  try {
    ({ dash } = await dashboardAfiliados());
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  return (
    <main className="wrap">
      <header className="page">
        <h1>Comisiones Afiliados</h1>
        <p>Realtors y agencias que recomiendan el CRM · {dash ? mesLargo(dash.mes) : ""}</p>
      </header>

      {error && <div className="card"><strong>No se pudo cargar.</strong><p className="empty">{error}</p></div>}

      {dash && (
        <>
          <div className="kpis kpis-4">
            <div className="kpi kpi-total"><span className="kpi-label">Afiliados activos</span><span className="kpi-num">{dash.afiliadosActivos}</span></div>
            <div className="kpi kpi-total"><span className="kpi-label">Clientes totales</span><span className="kpi-num">{dash.clientesTotales}</span></div>
            <div className="kpi kpi-pend"><span className="kpi-label">Pendiente este mes</span><span className="kpi-num">{usd(dash.pendienteMes)}</span></div>
            <div className="kpi kpi-pag"><span className="kpi-label">Pagado este mes</span><span className="kpi-num">{usd(dash.pagadoMes)}</span></div>
          </div>

          <section className="card">
            <div className="card-head"><span className="who">Pendientes de pago · {mesLargo(dash.mes)}</span></div>
            {dash.pendientes.length === 0 ? (
              <p className="empty">✅ Sin comisiones pendientes este mes.</p>
            ) : (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr><th>Cliente</th><th>Afiliado</th><th>Concepto</th><th className="num">Monto</th><th></th></tr>
                  </thead>
                  <tbody>
                    {dash.pendientes.map((f) => (
                      <tr key={f.clienteRef + f.mesIdx}>
                        <td>{f.clienteNombre}</td>
                        <td>
                          {f.afiliadoNombre}{" "}
                          <span className={f.tipo === "agencia" ? "tag-agencia" : "tag-partner"}>
                            {f.tipo === "agencia" ? "Agencia" : "Partner"}
                          </span>
                        </td>
                        <td className="td-concepto">{f.concepto}</td>
                        <td className="num">{usd(f.monto)}</td>
                        <td className="num">
                          <Link href={`/afiliados/comisiones/pagar?c=${f.clienteRef}&m=${f.mesIdx}`} className="btn-pagar">
                            Pagar
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
