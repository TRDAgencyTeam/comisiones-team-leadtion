import { calcularComision } from "comisiones-cs-engine/rules";
import type { ResultadoComision } from "comisiones-cs-engine/types";
import { fuente } from "@/lib/db";

// Siempre datos frescos desde Supabase (sin caché estática).
export const dynamic = "force-dynamic";

const CORTE_POR_DEFECTO = "2026-08-05";
const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

async function calcular(corte: string): Promise<ResultadoComision[]> {
  const [clientes, colaboradores] = await Promise.all([
    fuente.cargarClientes(),
    fuente.cargarColaboradores(),
  ]);
  return colaboradores
    .filter((c) => c.categoria === "fundador" || c.categoria === "nuevo")
    .map((c) => calcularComision(c, clientes, corte))
    .sort((a, b) => b.total - a.total);
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ corte?: string }>;
}) {
  const { corte: corteParam } = await searchParams;
  const corte = corteParam || CORTE_POR_DEFECTO;

  let resultados: ResultadoComision[] | null = null;
  let error: string | null = null;
  try {
    resultados = await calcular(corte);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  return (
    <main className="wrap">
      <header className="page">
        <h1>Comisiones CS — LEADTION</h1>
        <p>Cálculo en vivo del equipo de Customer Success · TRD Agency</p>
      </header>

      <form className="toolbar" method="get">
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

      {resultados &&
        resultados.map((r) => (
          <section className="card" key={r.colaboradorId}>
            <div className="card-head">
              <div>
                <span className="who">{r.colaboradorNombre}</span>
                <span className="cat">{r.categoria}</span>
                {r.enPeriodoPrueba && <span className="badge">en prueba</span>}
              </div>
              <div className="total">{usd(r.total)}</div>
            </div>

            {r.lineas.length === 0 ? (
              <p className="empty">Sin comisión a esta fecha de corte.</p>
            ) : (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Activación</th>
                      <th>Hitos</th>
                      <th className="num">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.lineas.map((l) => (
                      <tr key={l.clienteId}>
                        <td>{l.clienteNombre}</td>
                        <td>{l.fechaActivacion}</td>
                        <td>
                          {l.hitos.map((h) => (
                            <span className="hito-chip" key={h.hito} title={`base ${usd(h.base)} · ${h.tasa * 100}% · ${h.mesesBase} meses`}>
                              {h.hito} {usd(h.monto)}
                            </span>
                          ))}
                        </td>
                        <td className="num">{usd(l.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ))}

      <p className="foot">
        Corte <code>{corte}</code> · datos leídos de Supabase y calculados por el
        motor de reglas (Fase 2). El CHS se asume aprobado para el cálculo de
        referencia; la aprobación real por el admin llega en una fase posterior.
      </p>
    </main>
  );
}
