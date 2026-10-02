import {
  resultadoDeColaborador, corteProyeccion, cortesDe, pendientePorPagar,
  type CorteComision,
} from "@/lib/comisiones";
import { HitoTag } from "@/components/ProximosPagos";
import { mesHoyISO } from "@/lib/fecha";

/**
 * Portal del colaborador de Customer Success. Dashboard SIMPLE y explícito:
 *  - Hero: "Tu próximo pago" = SOLO los cortes ya cerrados y pendientes (lo que
 *    de verdad se le va a pagar en el siguiente pago). Nombra el/los mes(es).
 *  - "Pagado hasta el momento" = histórico liquidado.
 *  - Historial de cortes cerrados (pagados y por pagar) con detalle.
 *  - Meses que vienen (incluido el mes en curso): solo TOTAL aproximado, SIN
 *    nombres de cuentas, para que no se confunda con lo que se cobra ahora.
 * Es dinámico: al marcar un corte como Pagado en TRD→REG, ese mes pasa a
 * "pagado" y el hero muestra el siguiente mes pendiente.
 */

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const nombreMes = (ym: string) => { const [a, m] = ym.split("-").map(Number); return `${MESES[(m ?? 1) - 1]} ${a}`; };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const mesSiguiente = (ym: string) => { const [a, m] = ym.split("-").map(Number); const d = new Date(a!, m!, 1); return `${MESES[d.getMonth()]} ${d.getFullYear()}`; };
const fechaCorta = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

export async function PortalColaborador({ colaboradorId, nombre }: { colaboradorId: number; nombre: string }) {
  const mesActual = mesHoyISO();

  let error: string | null = null;
  let cortes: CorteComision[] = [];
  let porCobrar = 0;
  let yaPagado = 0;
  try {
    const r = await resultadoDeColaborador(colaboradorId, corteProyeccion(new Date()));
    if (r) {
      cortes = cortesDe(r);
      porCobrar = pendientePorPagar(r, mesActual);
      yaPagado = r.totalPagado;
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  // Cortes cerrados (meses anteriores al actual): historial, más reciente primero.
  const cerrados = cortes.filter((c) => c.mes < mesActual).sort((a, b) => b.mes.localeCompare(a.mes));
  // Meses pendientes (nombres) para el subtítulo del hero.
  const mesesPend = cerrados.filter((c) => c.pendiente > 0).map((c) => cap(nombreMes(c.mes)));
  // Mes en curso + próximos: SOLO total aproximado, sin nombres (máx 4 meses).
  const proximos = cortes.filter((c) => c.mes >= mesActual).slice(0, 4);

  const subHero = mesesPend.length === 0
    ? "Estás al día ✓"
    : mesesPend.length === 1
      ? `Corte de ${mesesPend[0]}`
      : `Cortes pendientes: ${mesesPend.join(" + ")}`;

  return (
    <main className="wrap">
      <header className="page">
        <h1>Hola, {nombre.split(" ")[0]} 👋</h1>
        <p>Tu resumen de comisiones de Customer Success</p>
      </header>

      {error ? (
        <div className="card"><strong>No se pudo cargar.</strong><p className="empty">{error}</p></div>
      ) : (
        <>
          <div className="kpis kpis-2">
            <div className="kpi kpi-pend">
              <span className="kpi-label">Tu próximo pago</span>
              <span className="kpi-num">{usd(porCobrar)}</span>
              <span className="kpi-sub">{subHero}</span>
            </div>
            <div className="kpi kpi-pag">
              <span className="kpi-label">Pagado hasta el momento</span>
              <span className="kpi-num">{usd(yaPagado)}</span>
              <span className="kpi-sub">histórico liquidado</span>
            </div>
          </div>

          <div className="callout-pago">
            <b>¿Cuándo se paga?</b> Cada mes (corte) se paga por separado, dentro de los primeros ~5 días
            del mes siguiente, junto con tu salario. <b>“Tu próximo pago”</b> es solo lo de los meses ya
            cerrados; el mes en curso todavía está sumando.
          </div>

          <section className="card">
            <div className="card-head"><span className="who">Historial de cortes</span></div>
            {cerrados.length === 0 ? (
              <p className="empty">Aún no tienes cortes cerrados.</p>
            ) : (
              cerrados.map((c) => (
                <div key={c.mes} className="corte-bloque">
                  <div className="corte-head">
                    <span className="corte-mes">Corte {cap(nombreMes(c.mes))}</span>
                    <span className="corte-montos">
                      {c.pendiente > 0 && <span className="estado-pendiente">Por pagar {usd(c.pendiente)}</span>}
                      {c.pagado > 0 && <span className="estado-pagado">Pagado {usd(c.pagado)}</span>}
                    </span>
                  </div>
                  <div className="table-scroll">
                    <table>
                      <thead><tr><th>Cliente</th><th>Hito</th><th className="num">Monto</th><th>Estado</th></tr></thead>
                      <tbody>
                        {c.filas.map((f, i) => (
                          <tr key={`${f.clienteId}-${f.hito}-${i}`}>
                            <td>{f.clienteNombre}</td>
                            <td><HitoTag h={f.hito} /></td>
                            <td className="num">{usd(f.monto)}</td>
                            <td>{f.estado === "pagado"
                              ? <span className="estado-pagado">✓ Pagado {fechaCorta(f.pagadoEn)}</span>
                              : <span className="estado-pendiente">Pendiente</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </section>

          {proximos.length > 0 && (
            <section className="card">
              <div className="card-head"><span className="who">Lo que viene (aproximado)</span></div>
              <p className="ciclo-nota">
                Estimado de los próximos meses. Son <b>aproximados</b> y dependen de que cada cuenta siga
                activa; no se cobran hasta que el mes cierre.
              </p>
              <ul className="aprox-list">
                {proximos.map((c) => {
                  const total = c.pendiente + c.pagado;
                  const enCurso = c.mes === mesActual;
                  return (
                    <li key={c.mes} className="aprox-row">
                      <span className="aprox-mes">
                        {cap(nombreMes(c.mes))}
                        {enCurso
                          ? <span className="badge">en curso</span>
                          : <span className="aprox-tag">aprox.</span>}
                      </span>
                      <span className="aprox-val">~{usd(total)}</span>
                    </li>
                  );
                })}
              </ul>
              <p className="foot" style={{ marginTop: 10 }}>
                El <b>mes en curso</b> ({cap(nombreMes(mesActual))}) se paga a inicios de <b>{mesSiguiente(mesActual)}</b>.
              </p>
            </section>
          )}
        </>
      )}
    </main>
  );
}
