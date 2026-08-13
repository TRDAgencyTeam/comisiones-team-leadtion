import { dashboardAfiliados } from "@/lib/afiliados";
import { marcarPagadoAfiliado, deshacerPagoAfiliado } from "../acciones";

export const dynamic = "force-dynamic";

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export default async function ComisionesAfiliadosPage() {
  let filas = null, error: string | null = null;
  try {
    ({ filas } = await dashboardAfiliados());
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  // Orden: por mes descendente, luego afiliado.
  const orden = (filas ?? []).slice().sort((a, b) =>
    b.mes.localeCompare(a.mes) || a.afiliadoNombre.localeCompare(b.afiliadoNombre));

  const totalPend = orden.filter((f) => !f.pagado).reduce((s, f) => s + f.monto, 0);

  return (
    <main className="wrap">
      <header className="page">
        <h1>Comisiones de afiliados</h1>
        <p>Cada cliente referido genera comisión durante 3 meses.</p>
      </header>

      {error && <div className="card"><strong>No se pudo cargar.</strong><p className="empty">{error}</p></div>}

      {filas && (
        <section className="card">
          <div className="card-head">
            <span className="who">Todas las comisiones</span>
            <span className="totales">
              <span className="t-pendiente">Pendiente total <b>{usd(Math.round(totalPend * 100) / 100)}</b></span>
            </span>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr><th>Mes</th><th>Cliente</th><th>Afiliado</th><th>Concepto</th><th className="num">Monto</th><th>Estado</th><th></th></tr>
              </thead>
              <tbody>
                {orden.map((f) => (
                  <tr key={f.clienteRef + f.mesIdx}>
                    <td>{f.mes}</td>
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
                        <form action={marcarPagadoAfiliado}>
                          <input type="hidden" name="clienteRef" value={f.clienteRef} />
                          <input type="hidden" name="mesNum" value={f.mesIdx} />
                          <input type="hidden" name="monto" value={f.monto} />
                          <button type="submit" className="btn-pagar">Pagar</button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
