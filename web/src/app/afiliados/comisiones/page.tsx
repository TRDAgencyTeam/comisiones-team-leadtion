import Link from "next/link";
import { dashboardAfiliados } from "@/lib/afiliados";
import { deshacerPagoAfiliado } from "../acciones";
import type { FilaComision } from "@/lib/afiliados-engine";

export const dynamic = "force-dynamic";

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const mesLargo = (mesISO: string) => { const [y, m] = mesISO.split("-").map(Number); return `${MESES[(m ?? 1) - 1]} ${y}`; };

function proximosMeses(now = new Date(), n = 3): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

export default async function ComisionesAfiliadosPage() {
  let filas: FilaComision[] | null = null;
  let error: string | null = null;
  try {
    ({ filas } = await dashboardAfiliados());
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  const meses = proximosMeses(new Date(), 3);

  return (
    <main className="wrap">
      <header className="page">
        <h1>Comisiones de afiliados</h1>
        <p>Las comisiones se pagan por mes. Vista del trimestre en curso (3 meses).</p>
      </header>

      {error && <div className="card"><strong>No se pudo cargar.</strong><p className="empty">{error}</p></div>}

      {filas && meses.map((mes, idx) => {
        const delMes = filas!.filter((f) => f.mes === mes)
          .sort((a, b) => Number(a.pagado) - Number(b.pagado) || a.afiliadoNombre.localeCompare(b.afiliadoNombre));
        const pend = delMes.filter((f) => !f.pagado).reduce((s, f) => s + f.monto, 0);
        const pag = delMes.filter((f) => f.pagado).reduce((s, f) => s + f.monto, 0);
        return (
          <section className="card" key={mes}>
            <div className="card-head">
              <span className="who">
                {mesLargo(mes)} {idx === 0 && <span className="badge-mes">mes actual</span>}
              </span>
              <div className="totales">
                <span className="t-pendiente">Pendiente <b>{usd(Math.round(pend * 100) / 100)}</b></span>
                <span className="t-pagado">Pagado <b>{usd(Math.round(pag * 100) / 100)}</b></span>
              </div>
            </div>
            {delMes.length === 0 ? (
              <p className="empty">Sin comisiones este mes.</p>
            ) : (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr><th>Cliente</th><th>Afiliado</th><th>Concepto</th><th className="num">Monto</th><th>Estado</th><th></th></tr>
                  </thead>
                  <tbody>
                    {delMes.map((f) => (
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
                        <td>{f.pagado ? <span className="estado-pagado">✓ Pagado</span> : <span className="estado-pendiente">Pendiente</span>}</td>
                        <td className="num">
                          {f.pagado ? (
                            <form action={deshacerPagoAfiliado}>
                              <input type="hidden" name="clienteRef" value={f.clienteRef} />
                              <input type="hidden" name="mesNum" value={f.mesIdx} />
                              <button type="submit" className="btn-deshacer">deshacer</button>
                            </form>
                          ) : (
                            <Link href={`/afiliados/comisiones/pagar?c=${f.clienteRef}&m=${f.mesIdx}`} className="btn-pagar">
                              Pagar
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}
    </main>
  );
}
