import Link from "next/link";
import {
  cargarResultados,
  resultadoDeColaborador,
  corteFinDeMes,
  corteProyeccion,
  type ResultadoVista,
} from "@/lib/comisiones";
import { ProximosPagos, type FilaFutura } from "@/components/ProximosPagos";

export const dynamic = "force-dynamic";

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const fechaCorta = (iso: string | null) => (iso ? iso.slice(0, 10) : "");
const nombreMes = (ym: string) => {
  const [a, m] = ym.split("-").map(Number);
  const s = new Date(a!, (m! - 1), 1).toLocaleDateString("es-CO", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

interface CorteVista {
  mes: string;
  filas: { clienteId: number; clienteNombre: string; hito: string; monto: number; estado: string; pagadoEn: string | null }[];
  pendiente: number;
  pagado: number;
}

/** Agrupa los hitos del colaborador por CORTE (mes del hito), no acumulado. */
function cortesDe(r: ResultadoVista): CorteVista[] {
  const mapa = new Map<string, CorteVista>();
  for (const l of r.lineas) {
    for (const h of l.hitos) {
      const mes = h.fechaHito.slice(0, 7);
      let c = mapa.get(mes);
      if (!c) { c = { mes, filas: [], pendiente: 0, pagado: 0 }; mapa.set(mes, c); }
      c.filas.push({ clienteId: l.clienteId, clienteNombre: l.clienteNombre, hito: h.hito, monto: h.monto, estado: h.estado, pagadoEn: h.pagadoEn });
      if (h.estado === "pagado") c.pagado += h.monto; else c.pendiente += h.monto;
    }
  }
  return [...mapa.values()].sort((a, b) => a.mes.localeCompare(b.mes));
}

const mesHoy = () => { const h = new Date(); return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}`; };

/** Pendiente POR PAGAR = suma de cortes ya CERRADOS (meses anteriores al actual)
 *  y no pagados. El mes en curso no se cobra todavía. */
function pendientePorPagar(r: ResultadoVista): number {
  const hoy = mesHoy();
  return cortesDe(r).filter((c) => c.mes < hoy).reduce((s, c) => s + c.pendiente, 0);
}

export default async function ComisionesPage({
  searchParams,
}: {
  searchParams: Promise<{ corte?: string; col?: string }>;
}) {
  const { corte: corteParam, col } = await searchParams;
  const corte = corteParam || corteFinDeMes();

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

  // Proyección (futuros) del colaborador seleccionado, para mostrar solo lectura.
  let futurosSel: FilaFutura[] = [];
  if (seleccionado) {
    try {
      const finMes = corteFinDeMes();
      const rFut = await resultadoDeColaborador(seleccionado.colaboradorId, corteProyeccion());
      if (rFut) {
        futurosSel = rFut.lineas.flatMap((l) =>
          l.hitos
            .filter((h) => h.fechaHito > finMes)
            .map((h) => ({ clienteNombre: l.clienteNombre, hito: h.hito, fechaHito: h.fechaHito, monto: h.monto })),
        );
      }
    } catch {
      // Si falla la proyección, no bloquea la vista principal.
    }
  }

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
                href={`/cs/comisiones?corte=${corte}&col=${r.colaboradorId}`}
                className={activa ? "col-tab activa" : "col-tab"}
              >
                <span className="col-tab-nombre">{r.colaboradorNombre}</span>
                <span className="col-tab-monto">{(() => { const p = pendientePorPagar(r); return p > 0 ? `Por pagar ${usd(p)}` : "al día"; })()}</span>
              </Link>
            );
          })}
        </div>
      )}

      {seleccionado && <ColaboradorCard r={seleccionado} corte={corte} futuros={futurosSel} />}
    </main>
  );
}

function ColaboradorCard({ r, corte, futuros }: { r: ResultadoVista; corte: string; futuros: FilaFutura[] }) {
  const cortes = cortesDe(r);
  const hoy = mesHoy();
  const porPagar = pendientePorPagar(r);
  return (
    <>
    <section className="card">
      <div className="card-head">
        <div>
          <span className="who">{r.colaboradorNombre}</span>
          <span className="cat">{r.categoria}</span>
          {r.enPeriodoPrueba && <span className="badge">en prueba</span>}
        </div>
        <div className="totales">
          {porPagar > 0
            ? <span className="t-pendiente">Por pagar (cortes cerrados) <b>{usd(porPagar)}</b></span>
            : <span className="t-pagado">Al día <b>✓</b></span>}
          <span className="t-pagado">Pagado histórico <b>{usd(r.totalPagado)}</b></span>
        </div>
      </div>

      {cortes.length === 0 ? (
        <p className="empty">Sin comisión a esta fecha de corte.</p>
      ) : (
        <>
          <p className="ciclo-nota">
            Cada <strong>corte es un mes</strong> y se paga por separado. El corte se salda al marcar <strong>Pagado</strong> ese
            mes en <strong>TRD → Registro contable</strong>; ahí desaparece de “pendiente”. No se acumulan cortes distintos.
          </p>
          {cortes.map((c) => (
            <div key={c.mes} className="corte-bloque">
              <div className="corte-head">
                <span className="corte-mes">Corte {nombreMes(c.mes)} {c.mes >= hoy && <span className="badge">en curso</span>}</span>
                <span className="corte-montos">
                  {c.pendiente > 0 && <span className={c.mes < hoy ? "estado-pendiente" : "estado-programado"}>{c.mes < hoy ? "Por pagar" : "Proyección"} {usd(c.pendiente)}</span>}
                  {c.pagado > 0 && <span className="estado-pagado">Pagado {usd(c.pagado)}</span>}
                </span>
              </div>
              <div className="table-scroll">
                <table>
                  <thead><tr><th>Cliente</th><th>Hito</th><th className="num">Monto</th><th>Estado</th></tr></thead>
                  <tbody>
                    {c.filas.map((f, i) => (
                      <tr key={`${f.clienteId}-${f.hito}-${i}`}>
                        <td><Link href={`/cs/clientes/${f.clienteId}`} className="link-cliente">{f.clienteNombre}</Link></td>
                        <td><span className="hito-chip">{f.hito}</span></td>
                        <td className="num">{usd(f.monto)}</td>
                        <td>{f.estado === "pagado" ? <span className="estado-pagado">✓ Pagado {fechaCorta(f.pagadoEn)}</span> : <span className="estado-pendiente">Pendiente</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </>
      )}
    </section>

    <section className="card">
      <div className="card-head">
        <span className="who">Próximos pagos de {r.colaboradorNombre} (proyección)</span>
        <span className="cat">solo lectura</span>
      </div>
      <ProximosPagos futuros={futuros} />
    </section>
    </>
  );
}
