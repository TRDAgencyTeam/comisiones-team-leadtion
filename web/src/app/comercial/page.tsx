import Link from "next/link";
import { comisionesComercialMes, totalComercialMes, PCT_COMERCIAL } from "@/lib/comercial";
import { marcarComisionComercial } from "./acciones";

export const dynamic = "force-dynamic";

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const mesISO = () => { const h = new Date(); return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}`; };
const MES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const mesLargo = (m: string) => { const [y, mm] = m.split("-").map(Number); return `${MES[(mm ?? 1) - 1]} ${y}`; };
const hoy = () => new Date().toISOString().slice(0, 10);

function mesVecino(mes: string, delta: number): string {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(y!, (m! - 1) + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function ComercialPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const sp = await searchParams;
  const mes = sp.mes && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : mesISO();

  let filas = null, tot = { total: 0, n: 0 }, error: string | null = null;
  try {
    [filas, tot] = await Promise.all([comisionesComercialMes(mes), totalComercialMes(mes)]);
  } catch (e) { error = e instanceof Error ? e.message : String(e); }

  const pendiente = filas ? filas.filter((f) => f.estado !== "pagado").reduce((s, f) => s + f.montoUsd, 0) : 0;
  const pagado = filas ? filas.filter((f) => f.estado === "pagado").reduce((s, f) => s + f.montoUsd, 0) : 0;

  return (
    <main className="wrap">
      <header className="page page-head-row">
        <div>
          <h1>Comercial</h1>
          <p>Comisión del {PCT_COMERCIAL}% por cada cliente nuevo (sobre la venta neta, después de pasarela).</p>
        </div>
        <div className="cf-nav" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Link href={`/comercial?mes=${mesVecino(mes, -1)}`} className="btn-secondary">←</Link>
          <span style={{ fontWeight: 500 }}>{mesLargo(mes)}</span>
          <Link href={`/comercial?mes=${mesVecino(mes, 1)}`} className="btn-secondary">→</Link>
        </div>
      </header>

      {error && <div className="card"><strong>No se pudo cargar.</strong><p className="empty">{error}</p></div>}

      <div className="mini-stats card">
        <div className="mini-stat"><span className="ms-num">{usd(tot.total)}</span><span className="ms-lbl">Comisión del mes</span></div>
        <div className="mini-stat"><span className="ms-num ms-warn">{usd(pendiente)}</span><span className="ms-lbl">Pendiente</span></div>
        <div className="mini-stat"><span className="ms-num ms-ok">{usd(pagado)}</span><span className="ms-lbl">Pagado</span></div>
        <div className="mini-stat"><span className="ms-num">{tot.n}</span><span className="ms-lbl">Clientes nuevos</span></div>
      </div>

      <section className="card">
        <div className="card-head"><span className="who">Comisiones de {mesLargo(mes)}</span><span className="total">{usd(tot.total)}</span></div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Cliente</th><th>Comercial</th><th className="num">Facturado</th><th className="num">Pasarela</th>
                <th className="num">Neto</th><th className="num">Comisión {PCT_COMERCIAL}%</th><th>Estado</th><th></th>
              </tr>
            </thead>
            <tbody>
              {(filas ?? []).map((f) => (
                <tr key={f.id}>
                  <td>{f.clienteNombre}</td>
                  <td>{f.colaboradorNombre}</td>
                  <td className="num">{usd(f.baseFacturado)}</td>
                  <td className="num">{f.pasarela > 0 ? `−${usd(f.pasarela)}` : "—"}</td>
                  <td className="num">{usd(f.baseNeta)}</td>
                  <td className="num strong">{usd(f.montoUsd)}</td>
                  <td>{f.estado === "pagado"
                    ? <span className="estado-pagado">✓ Pagado{f.fechaPago ? ` · ${f.fechaPago}` : ""}</span>
                    : <span className="estado-pendiente">Pendiente</span>}</td>
                  <td className="col-accion">
                    {f.estado === "pagado" ? (
                      <form action={marcarComisionComercial}>
                        <input type="hidden" name="id" value={f.id} />
                        <input type="hidden" name="pagar" value="0" />
                        <button type="submit" className="btn-secondary">Revertir</button>
                      </form>
                    ) : (
                      <form action={marcarComisionComercial} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <input type="hidden" name="id" value={f.id} />
                        <input type="hidden" name="pagar" value="1" />
                        <input type="date" name="fechaPago" defaultValue={hoy()} title="Fecha de pago" />
                        <button type="submit" className="btn-primary">Pagar</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {(!filas || filas.length === 0) && (
                <tr><td colSpan={8} className="empty">Sin comisiones comerciales este mes.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="foot" style={{ marginTop: 10 }}>
          Solo aparecen los <b>clientes nuevos</b> marcados como venta comercial al crearlos en Facturación.
          El total del mes se refleja como egreso <b>“Comisiones equipo comercial”</b> en la plataforma madre.
        </p>
      </section>
    </main>
  );
}
