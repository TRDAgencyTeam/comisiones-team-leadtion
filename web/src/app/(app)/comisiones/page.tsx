import Link from "next/link";
import { cargarResultados, type ResultadoVista } from "@/lib/comisiones";
import {
  marcarCicloPagado,
  marcarHitoPagado,
  deshacerHitoPagado,
} from "@/app/pagos-actions";

export const dynamic = "force-dynamic";

const CORTE_POR_DEFECTO = "2026-08-05";
const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const fechaCorta = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

export default async function ComisionesPage({
  searchParams,
}: {
  searchParams: Promise<{ corte?: string; col?: string }>;
}) {
  const { corte: corteParam, col } = await searchParams;
  const corte = corteParam || CORTE_POR_DEFECTO;

  let resultados: ResultadoVista[] | null = null;
  let error: string | null = null;
  try {
    resultados = await cargarResultados(corte);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  // Pestañas: colaboradores activos que comisionan. Selección por ?col.
  const tabs = (resultados ?? []).filter((r) => r.activo);
  const seleccionado =
    tabs.find((r) => String(r.colaboradorId) === col) ?? tabs[0] ?? resultados?.[0];

  return (
    <main className="wrap">
      <header className="page">
        <h1>Comisiones por colaborador</h1>
        <p>Cálculo y control de pagos a una fecha de corte.</p>
      </header>

      <form className="toolbar" method="get">
        {seleccionado && <input type="hidden" name="col" value={seleccionado.colaboradorId} />}
        <label>
          Fecha de corte
          <input type="date" name="corte" defaultValue={corte} />
        </label>
        <button type="submit">Calcular</button>
      </form>

      {error && (
        <div className="card">
          <strong>No se pudo calcular.</strong>
          <p className="empty">{error}</p>
        </div>
      )}

      {tabs.length > 0 && (
        <div className="col-tabs">
          {tabs.map((r) => {
            const activa = seleccionado?.colaboradorId === r.colaboradorId;
            return (
              <Link
                key={r.colaboradorId}
                href={`/comisiones?corte=${corte}&col=${r.colaboradorId}`}
                className={activa ? "col-tab activa" : "col-tab"}
              >
                <span className="col-tab-nombre">{r.colaboradorNombre}</span>
                <span className="col-tab-monto">{usd(r.totalPendiente)} pend.</span>
              </Link>
            );
          })}
        </div>
      )}

      {seleccionado && <ColaboradorCard r={seleccionado} corte={corte} />}
    </main>
  );
}

function ColaboradorCard({ r, corte }: { r: ResultadoVista; corte: string }) {
  return (
    <section className="card">
      <div className="card-head">
        <div>
          <span className="who">{r.colaboradorNombre}</span>
          <span className="cat">{r.categoria}</span>
          {r.enPeriodoPrueba && <span className="badge">en prueba</span>}
        </div>
        <div className="totales">
          <span className="t-pendiente">
            Pendiente <b>{usd(r.totalPendiente)}</b>
          </span>
          <span className="t-pagado">
            Pagado <b>{usd(r.totalPagado)}</b>
          </span>
        </div>
      </div>

      {r.lineas.length === 0 ? (
        <p className="empty">Sin comisión a esta fecha de corte.</p>
      ) : (
        <>
          {r.totalPendiente > 0 && (
            <form action={marcarCicloPagado} className="ciclo-form">
              <input type="hidden" name="colaboradorId" value={r.colaboradorId} />
              <input type="hidden" name="corte" value={corte} />
              <button type="submit" className="btn-ciclo">
                Marcar todo lo pendiente como pagado ({usd(r.totalPendiente)})
              </button>
            </form>
          )}
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Activación</th>
                  <th>Hito</th>
                  <th className="num">Monto</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {r.lineas.flatMap((l) =>
                  l.hitos.map((h) => (
                    <tr key={`${l.clienteId}-${h.hito}`}>
                      <td>{l.clienteNombre}</td>
                      <td>{l.fechaActivacion}</td>
                      <td>
                        <span className="hito-chip">{h.hito}</span>
                      </td>
                      <td className="num">{usd(h.monto)}</td>
                      <td>
                        {h.estado === "pagado" ? (
                          <span className="estado-pagado">✓ Pagado {fechaCorta(h.pagadoEn)}</span>
                        ) : (
                          <span className="estado-pendiente">Pendiente</span>
                        )}
                      </td>
                      <td className="num">
                        {h.estado === "pagado" ? (
                          <form action={deshacerHitoPagado}>
                            <input type="hidden" name="colaboradorId" value={r.colaboradorId} />
                            <input type="hidden" name="clienteId" value={l.clienteId} />
                            <input type="hidden" name="hito" value={h.hito} />
                            <button type="submit" className="btn-deshacer" title="Deshacer pago">
                              deshacer
                            </button>
                          </form>
                        ) : (
                          <form action={marcarHitoPagado}>
                            <input type="hidden" name="colaboradorId" value={r.colaboradorId} />
                            <input type="hidden" name="clienteId" value={l.clienteId} />
                            <input type="hidden" name="hito" value={h.hito} />
                            <input type="hidden" name="corte" value={corte} />
                            <button type="submit" className="btn-pagar" title="Marcar pagado">
                              Marcar pagado
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
