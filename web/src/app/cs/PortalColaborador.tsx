import { resultadoDeColaborador, corteFinDeMes, corteProyeccion } from "@/lib/comisiones";
import { ProximosPagos, HitoTag, type FilaFutura } from "@/components/ProximosPagos";

/**
 * Portal del colaborador de Customer Success. Vista limitada (solo lo suyo):
 *  - Lo que aplica para su próximo pago: por cada cuenta, fecha de activación,
 *    hito (T1/T2/T3, con la matemática del %), monto y estado (pendiente/pagado).
 *  - Proyección de próximos períodos (depende de que la cuenta siga activa).
 *
 * Usa el MISMO corte que el panel admin (fin del mes en curso) para que los
 * números coincidan entre lo que ve el admin y lo que ve el colaborador.
 */

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const pct = (t: number) => `${Math.round(t * 100)}%`;
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const fechaCorta = (iso: string) => { const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`; };

interface Fila extends FilaFutura {
  clienteId: number;
  fechaActivacion: string;
  base: number;
  tasa: number;
  mesesBase: number;
  estado: string;
}

export async function PortalColaborador({
  colaboradorId,
  nombre,
}: {
  colaboradorId: number;
  nombre: string;
}) {
  const now = new Date();
  const mesActual = MESES[now.getMonth()];
  const finMes = corteFinDeMes(now);

  let error: string | null = null;
  let filas: Fila[] = [];
  try {
    const r = await resultadoDeColaborador(colaboradorId, corteProyeccion(now));
    if (r) {
      filas = r.lineas.flatMap((l) =>
        l.hitos.map((h) => ({
          clienteId: l.clienteId,
          clienteNombre: l.clienteNombre,
          fechaActivacion: l.fechaActivacion,
          hito: h.hito,
          fechaHito: h.fechaHito,
          base: h.base,
          tasa: h.tasa,
          mesesBase: h.mesesBase,
          monto: h.monto,
          estado: h.estado,
        })),
      );
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  // Corte compartido con el admin: "de este mes" = hitos hasta fin de mes.
  const alcanzados = filas.filter((f) => f.fechaHito <= finMes).sort((a, b) => b.fechaHito.localeCompare(a.fechaHito));
  const futuros = filas.filter((f) => f.fechaHito > finMes);

  const porCobrar = round2(alcanzados.filter((f) => f.estado === "pendiente").reduce((s, f) => s + f.monto, 0));
  const yaPagado = round2(alcanzados.filter((f) => f.estado === "pagado").reduce((s, f) => s + f.monto, 0));
  const cuentasConComision = new Set(alcanzados.map((f) => f.clienteId)).size;

  return (
    <main className="wrap">
      <header className="page">
        <h1>Hola, {nombre.split(" ")[0]} 👋</h1>
        <p>Tu resumen de comisiones de Customer Success · {mesActual} {now.getFullYear()}</p>
      </header>

      {error ? (
        <div className="card"><strong>No se pudo cargar.</strong><p className="empty">{error}</p></div>
      ) : (
        <>
          <div className="kpis">
            <div className="kpi kpi-pend">
              <span className="kpi-label">Por cobrar (aplica a este pago)</span>
              <span className="kpi-num">{usd(porCobrar)}</span>
            </div>
            <div className="kpi kpi-pag">
              <span className="kpi-label">Ya pagado</span>
              <span className="kpi-num">{usd(yaPagado)}</span>
            </div>
            <div className="kpi kpi-total">
              <span className="kpi-label">Cuentas con comisión</span>
              <span className="kpi-num">{cuentasConComision}</span>
            </div>
          </div>

          <div className="callout-pago">
            <b>¿Cuándo se paga?</b> Las comisiones de cada mes se pagan dentro de los primeros ~5 días
            del mes siguiente, junto con el pago normal de tu salario. (Ejemplo: lo de {mesActual} se
            paga a inicios del mes siguiente.)
          </div>

          <section className="card">
            <div className="card-head"><span className="who">Tus comisiones</span></div>
            {alcanzados.length === 0 ? (
              <p className="empty">Todavía no tienes hitos de comisión alcanzados.</p>
            ) : (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Activación</th>
                      <th>Hito</th>
                      <th>Cálculo (% mensual × meses × licencia)</th>
                      <th className="num">Monto</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alcanzados.map((f, i) => (
                      <tr key={`${f.clienteId}-${f.hito}-${i}`}>
                        <td>{f.clienteNombre}</td>
                        <td>{fechaCorta(f.fechaActivacion)}</td>
                        <td><HitoTag h={f.hito} /></td>
                        <td className="td-concepto">{pct(f.tasa)} × {f.mesesBase} × {usd(f.base)}</td>
                        <td className="num">{usd(f.monto)}</td>
                        <td>
                          <span className={f.estado === "pagado" ? "estado-pagado" : "estado-pendiente"}>
                            {f.estado === "pagado" ? "Pagado" : "Pendiente"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="foot" style={{ marginTop: 8 }}>
              Cada hito es un pago único: <b>% mensual × meses × licencia</b> (la licencia es $67 o $69
              según cuándo se activó la cuenta). Ej.: T1 = 5% × 3 meses × licencia.
              Cuando el administrador registre tu pago, el estado cambiará a <b>Pagado</b> aquí mismo.
            </p>
          </section>

          <section className="card">
            <div className="card-head"><span className="who">Próximos pagos (proyección)</span></div>
            <ProximosPagos futuros={futuros} now={now} />
          </section>

          <p className="foot">
            <b>Nota:</b> todos los nuevos clientes se irán agregando a tu tabla automáticamente a medida
            que se registren. Los montos futuros son estimados y dependen de que cada cuenta siga activa
            (si una cuenta se cancela o se pausa, deja de generar comisión).
          </p>
        </>
      )}
    </main>
  );
}

function round2(n: number) { return Math.round((n + Number.EPSILON) * 100) / 100; }
