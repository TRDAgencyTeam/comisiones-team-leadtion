import { resultadoDeColaborador } from "@/lib/comisiones";

/**
 * Portal del colaborador de Customer Success. Vista limitada (solo lo suyo):
 *  - Lo que aplica para su próximo pago: por cada cuenta, fecha de activación,
 *    hito (T1/T2/T3, con la matemática del %), monto y estado (pendiente/pagado).
 *  - Proyección de próximos períodos (depende de que la cuenta siga activa).
 */

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const pct = (t: number) => `${Math.round(t * 100)}%`;
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const mesLargo = (iso: string) => { const [y, m] = iso.split("-").map(Number); return `${MESES[(m ?? 1) - 1]} ${y}`; };
const fechaCorta = (iso: string) => { const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`; };

/** Etiqueta y explicación de cada hito (para el tooltip). */
const HITO_INFO: Record<string, { trim: string; meses: number }> = {
  T1: { trim: "Trimestre 1", meses: 3 },
  T2: { trim: "Trimestre 2", meses: 6 },
  T3: { trim: "Trimestre 3", meses: 12 },
};

interface Fila {
  clienteId: number;
  clienteNombre: string;
  fechaActivacion: string;
  hito: string;
  fechaHito: string;
  base: number;
  tasa: number;
  mesesBase: number;
  monto: number;
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
  const hoy = now.toISOString().slice(0, 10);
  const mesActual = MESES[now.getMonth()];
  // Corte a 18 meses para incluir los hitos futuros (proyección).
  const corteFuturo = new Date(now.getFullYear() + 1, now.getMonth() + 6, 0).toISOString().slice(0, 10);

  let error: string | null = null;
  let filas: Fila[] = [];
  try {
    const r = await resultadoDeColaborador(colaboradorId, corteFuturo);
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

  const alcanzados = filas.filter((f) => f.fechaHito <= hoy).sort((a, b) => b.fechaHito.localeCompare(a.fechaHito));
  const futuros = filas.filter((f) => f.fechaHito > hoy).sort((a, b) => a.fechaHito.localeCompare(b.fechaHito));

  const porCobrar = round2(alcanzados.filter((f) => f.estado === "pendiente").reduce((s, f) => s + f.monto, 0));
  const yaPagado = round2(alcanzados.filter((f) => f.estado === "pagado").reduce((s, f) => s + f.monto, 0));
  const cuentasConComision = new Set(alcanzados.map((f) => f.clienteId)).size;

  const proximaFecha = futuros[0]?.fechaHito ?? null;
  // Proyección: hitos de los próximos ~4 meses (si las cuentas siguen activas).
  const limite4m = new Date(now.getFullYear(), now.getMonth() + 4, 0).toISOString().slice(0, 10);
  const proximos = futuros.filter((f) => f.fechaHito <= limite4m);
  const proyeccion = round2(proximos.reduce((s, f) => s + f.monto, 0));

  const HitoTag = ({ h }: { h: string }) => {
    const info = HITO_INFO[h];
    return (
      <span className="hito-tag" title={info ? `${info.trim} · se cumple a los ${info.meses} meses de la activación` : h}>
        {h}
      </span>
    );
  };

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
            {futuros.length === 0 ? (
              <p className="empty">No tienes hitos próximos programados por ahora.</p>
            ) : (
              <>
                <p style={{ margin: "0 0 12px" }}>
                  Tu próximo período con comisión es <b>{proximaFecha ? mesLargo(proximaFecha) : "—"}</b>.
                  En los próximos meses se proyectan <b>{usd(proyeccion)}</b> ({proximos.length} hito{proximos.length === 1 ? "" : "s"}),
                  <b> siempre que esas cuentas sigan activas</b>.
                </p>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr><th>Cliente</th><th>Fecha estimada</th><th>Hito</th><th className="num">Monto estimado</th></tr>
                    </thead>
                    <tbody>
                      {futuros.slice(0, 12).map((f, i) => (
                        <tr key={`fut-${f.clienteId}-${f.hito}-${i}`}>
                          <td>{f.clienteNombre}</td>
                          <td>{mesLargo(f.fechaHito)}</td>
                          <td><HitoTag h={f.hito} /></td>
                          <td className="num">{usd(f.monto)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
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
