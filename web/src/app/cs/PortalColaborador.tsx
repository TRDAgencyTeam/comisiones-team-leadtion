import {
  resultadoDeColaborador, corteFinDeMes, corteProyeccion, cortesDe, pendientePorPagar,
  type CorteComision,
} from "@/lib/comisiones";
import { ProximosPagos, HitoTag, type FilaFutura } from "@/components/ProximosPagos";
import { mesHoyISO } from "@/lib/fecha";

/**
 * Portal del colaborador de Customer Success. Vista limitada (solo lo suyo),
 * organizada POR CORTE (un corte = un mes, se paga por separado), igual que el
 * panel admin:
 *  - "Por cobrar (aplica a este pago)" = SOLO los cortes ya cerrados y pendientes
 *    (los meses anteriores). El mes en curso NO se cobra todavía.
 *  - El mes en curso se muestra como "en curso" (se paga a inicios del siguiente).
 *  - Historial de cortes pasados (pagados y por pagar) + proyección futura.
 */

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const nombreMes = (ym: string) => { const [a, m] = ym.split("-").map(Number); return `${MESES[(m ?? 1) - 1]} ${a}`; };
const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const mesSiguienteNombre = (ym: string) => { const [a, m] = ym.split("-").map(Number); const d = new Date(a!, m!, 1); return `${MESES[d.getMonth()]} ${d.getFullYear()}`; };

export async function PortalColaborador({ colaboradorId, nombre }: { colaboradorId: number; nombre: string }) {
  const now = new Date();
  const finMes = corteFinDeMes(now);
  const mesActual = mesHoyISO();

  let error: string | null = null;
  let cortes: CorteComision[] = [];
  let porCobrar = 0;
  let yaPagado = 0;
  let futuros: FilaFutura[] = [];
  try {
    const r = await resultadoDeColaborador(colaboradorId, corteProyeccion(now));
    if (r) {
      cortes = cortesDe(r);
      porCobrar = pendientePorPagar(r, mesActual);
      yaPagado = r.totalPagado;
      futuros = r.lineas.flatMap((l) =>
        l.hitos.filter((h) => h.fechaHito > finMes).map((h) => ({
          clienteNombre: l.clienteNombre, hito: h.hito, fechaHito: h.fechaHito, monto: h.monto,
        })),
      );
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  const cerrados = cortes.filter((c) => c.mes < mesActual).sort((a, b) => b.mes.localeCompare(a.mes)); // recientes primero
  const enCurso = cortes.find((c) => c.mes === mesActual) ?? null;
  const cuentas = new Set(
    cortes.filter((c) => c.mes <= mesActual).flatMap((c) => c.filas.map((f) => f.clienteId)),
  ).size;

  return (
    <main className="wrap">
      <header className="page">
        <h1>Hola, {nombre.split(" ")[0]} 👋</h1>
        <p>Tu resumen de comisiones de Customer Success · {capitalizar(nombreMes(mesActual))}</p>
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
              <span className="kpi-label">Ya pagado (histórico)</span>
              <span className="kpi-num">{usd(yaPagado)}</span>
            </div>
            <div className="kpi kpi-total">
              <span className="kpi-label">Cuentas con comisión</span>
              <span className="kpi-num">{cuentas}</span>
            </div>
          </div>

          <div className="callout-pago">
            <b>¿Cuándo se paga?</b> Cada corte es un mes y se paga por separado, dentro de los primeros
            ~5 días del mes siguiente, junto con tu salario. <b>“Por cobrar”</b> es solo lo de los meses
            ya cerrados; el mes en curso todavía está sumando y se paga el mes siguiente.
          </div>

          {enCurso && (
            <section className="card">
              <div className="card-head">
                <span className="who">Mes en curso · {capitalizar(nombreMes(enCurso.mes))} <span className="badge">en curso</span></span>
                <span className="t-pagado">Va sumando <b>{usd(enCurso.pendiente + enCurso.pagado)}</b></span>
              </div>
              <p className="ciclo-nota">Este mes aún no cierra: se paga a inicios de <b>{mesSiguienteNombre(enCurso.mes)}</b>. No entra en “Por cobrar” todavía.</p>
              <CorteTabla filas={enCurso.filas} enCurso />
            </section>
          )}

          <section className="card">
            <div className="card-head"><span className="who">Historial de cortes</span></div>
            {cerrados.length === 0 ? (
              <p className="empty">Aún no tienes cortes cerrados.</p>
            ) : (
              cerrados.map((c) => (
                <div key={c.mes} className="corte-bloque">
                  <div className="corte-head">
                    <span className="corte-mes">Corte {capitalizar(nombreMes(c.mes))}</span>
                    <span className="corte-montos">
                      {c.pendiente > 0 && <span className="estado-pendiente">Por pagar {usd(c.pendiente)}</span>}
                      {c.pagado > 0 && <span className="estado-pagado">Pagado {usd(c.pagado)}</span>}
                    </span>
                  </div>
                  <CorteTabla filas={c.filas} />
                </div>
              ))
            )}
          </section>

          <section className="card">
            <div className="card-head"><span className="who">Próximos pagos (proyección)</span></div>
            <ProximosPagos futuros={futuros} now={now} />
          </section>

          <p className="foot">
            <b>Nota:</b> cada hito es un pago único (<b>% mensual × meses × licencia</b>; la licencia es
            $67 o $69 según cuándo se activó la cuenta). Cuando el administrador registre el pago de un
            corte, ese mes pasará a <b>Pagado</b> aquí mismo. Los montos futuros dependen de que cada
            cuenta siga activa.
          </p>
        </>
      )}
    </main>
  );
}

const fechaCorta = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

function CorteTabla({ filas, enCurso = false }: { filas: CorteComision["filas"]; enCurso?: boolean }) {
  return (
    <div className="table-scroll">
      <table>
        <thead><tr><th>Cliente</th><th>Hito</th><th className="num">Monto</th><th>Estado</th></tr></thead>
        <tbody>
          {filas.map((f, i) => (
            <tr key={`${f.clienteId}-${f.hito}-${i}`}>
              <td>{f.clienteNombre}</td>
              <td><HitoTag h={f.hito} /></td>
              <td className="num">{usd(f.monto)}</td>
              <td>
                {f.estado === "pagado"
                  ? <span className="estado-pagado">✓ Pagado {fechaCorta(f.pagadoEn)}</span>
                  : <span className={enCurso ? "estado-programado" : "estado-pendiente"}>{enCurso ? "En curso" : "Pendiente"}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
