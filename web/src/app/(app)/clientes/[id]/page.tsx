import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerCliente } from "@/lib/clientes";
import { cambiarEstadoCliente } from "../acciones";

export const dynamic = "force-dynamic";

const CORTE_POR_DEFECTO = "2026-08-05";
const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

const ESTADO_MES: Record<string, { txt: string; cls: string }> = {
  activo: { txt: "Activo", cls: "em-activo" },
  cancelado: { txt: "Cancelado", cls: "em-cancelado" },
  pausado: { txt: "Pausado", cls: "em-pausado" },
  incluido_en_marketing: { txt: "Incluido en marketing", cls: "em-mkt" },
  en_riesgo_o_mora: { txt: "En riesgo / mora", cls: "em-riesgo" },
  previo_a_activacion: { txt: "Previo a activación", cls: "em-gris" },
  sin_datos: { txt: "Sin datos", cls: "em-gris" },
};
const PLAN_TIPO: Record<string, string> = { agente_ai: "Agente AI", reactivacion: "Reactivación" };

export default async function FichaClientePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ corte?: string }>;
}) {
  const { id } = await params;
  const { corte: corteParam } = await searchParams;
  const corte = corteParam || CORTE_POR_DEFECTO;

  const c = await obtenerCliente(Number(id), corte);
  if (!c) notFound();

  const hoy = new Date().toISOString().slice(0, 10);
  const badge = ESTADO_MES[c.estado] ?? { txt: c.estado, cls: "em-gris" };

  return (
    <main className="wrap">
      <p className="volver"><Link href="/clientes">← Clientes</Link></p>

      <header className="page page-head-row">
        <div>
          <h1>{c.nombre}</h1>
          <p>
            <span className={`em ${badge.cls}`}>{badge.txt}</span>
            {c.plan ? ` · ${c.plan}` : ""}
            {c.motivoEstado && c.estado !== "activo" ? ` · ${c.motivoEstado}` : ""}
          </p>
        </div>
        <Link href={`/clientes/${c.id}/editar`} className="btn-secondary">
          Editar datos
        </Link>
      </header>

      <section className="card">
        <div className="datos-grid">
          <div><span className="dato-label">Activación</span>{c.fechaActivacion ?? "—"}</div>
          <div><span className="dato-label">Plan de entrada</span>{c.planTipo ? PLAN_TIPO[c.planTipo] : "—"}</div>
          <div><span className="dato-label">Soporte activo</span>{c.soporteValor !== null ? usd(c.soporteValor) : "Sin soporte"}</div>
          <div><span className="dato-label">Valor mostrado</span>{c.valorLicencia !== null ? usd(c.valorLicencia) : "—"}</div>
          <div><span className="dato-label">CRM en marketing</span>{c.incluyeCrmMarketing ? "Sí" : "No"}</div>
          <div><span className="dato-label">Servicios</span>{c.serviciosAdicionales ?? "—"}</div>
        </div>
        {c.notas && <p className="notas">{c.notas}</p>}
      </section>

      <section className="card">
        <div className="card-head">
          <span className="who">Inversión del cliente (LTV)</span>
          <span className="total">{usd(c.ltv)}</span>
        </div>
        <div className="mini-stats">
          <div className="mini-stat"><span className="ms-num">{usd(c.ltv)}</span><span className="ms-lbl">Total invertido</span></div>
          <div className="mini-stat"><span className="ms-num">{c.mesesConCobro}</span><span className="ms-lbl">Meses con cobro</span></div>
          <div className="mini-stat"><span className="ms-num">{usd(c.promedioMensual)}</span><span className="ms-lbl">Promedio mensual</span></div>
          {c.incluyeCrmMarketing && (
            <div className="mini-stat"><span className="ms-num ms-warn">Marketing</span><span className="ms-lbl">Licencia vía plan de mkt</span></div>
          )}
        </div>
        <p className="foot" style={{ marginTop: 14 }}>
          LTV = suma de todos los cobros mensuales registrados (licencia + servicios).
          El detalle por mes está más abajo.
        </p>
      </section>

      {/* --- Estado de la cuenta + acciones --- */}
      <section className="card">
        <div className="card-head"><span className="who">Estado de la cuenta</span></div>
        <div className="acciones-estado">
          {c.estado === "activo" && (
            <>
              <form action={cambiarEstadoCliente} className="accion-form">
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="accion" value="pausar" />
                <input type="text" name="motivo" placeholder="Motivo de la pausa…" required />
                <button type="submit" className="btn-warn">Pausar / Congelar</button>
              </form>
              <form action={cambiarEstadoCliente} className="accion-form">
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="accion" value="cancelar" />
                <input type="date" name="fechaCancelacion" defaultValue={hoy} title="Fecha de cancelación" />
                <input type="text" name="motivo" placeholder="Motivo de cancelación…" required />
                <button type="submit" className="btn-danger">Cancelar cuenta</button>
              </form>
            </>
          )}
          {c.estado === "pausado" && (
            <>
              <form action={cambiarEstadoCliente} className="accion-form">
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="accion" value="reactivar" />
                <button type="submit" className="btn-primary">Reactivar</button>
              </form>
              <form action={cambiarEstadoCliente} className="accion-form">
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="accion" value="cancelar" />
                <input type="date" name="fechaCancelacion" defaultValue={hoy} />
                <input type="text" name="motivo" placeholder="Motivo de cancelación…" required />
                <button type="submit" className="btn-danger">Cancelar cuenta</button>
              </form>
            </>
          )}
          {c.estado === "cancelado" && (
            <form action={cambiarEstadoCliente} className="accion-form">
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="accion" value="reactivar" />
              <button type="submit" className="btn-primary">Reactivar</button>
            </form>
          )}
        </div>

        {c.historialEstado.length > 0 && (
          <>
            <h3 className="sub-h">Historial de estados</h3>
            <ul className="hist-estados">
              {c.historialEstado.map((h, i) => {
                const e = ESTADO_MES[h.estado] ?? { txt: h.estado, cls: "em-gris" };
                return (
                  <li key={i}>
                    <span className={`em ${e.cls}`}>{e.txt}</span>
                    <span className="hist-fecha">{h.cambiadoEn.slice(0, 10)}</span>
                    {h.motivo && <span className="hist-motivo">— {h.motivo}</span>}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <span className="who">Comisión que representa para el equipo</span>
          <span className="total">{usd(c.comisionEquipo)}</span>
        </div>
        {c.aportes.length === 0 ? (
          <p className="empty">No genera comisión al corte {corte}.</p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead><tr><th>Colaborador</th><th>Hito</th><th className="num">Monto</th><th>Estado</th></tr></thead>
              <tbody>
                {c.aportes.map((a, i) => (
                  <tr key={i}>
                    <td>{a.colaborador}</td>
                    <td><span className="hito-chip">{a.hito}</span></td>
                    <td className="num">{usd(a.monto)}</td>
                    <td>{a.estado === "pagado" ? <span className="estado-pagado">✓ Pagado</span> : <span className="estado-pendiente">Pendiente</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-head"><span className="who">Historial mensual</span></div>
        {c.pagos.length === 0 ? (
          <p className="empty">Sin historial mensual registrado.</p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead><tr><th>Mes</th><th>Estado</th><th className="num">Valor</th></tr></thead>
              <tbody>
                {c.pagos.map((p) => {
                  const e = ESTADO_MES[p.estadoMes] ?? { txt: p.estadoMes, cls: "em-gris" };
                  return (
                    <tr key={p.mes}>
                      <td>{p.mes.slice(0, 7)}</td>
                      <td><span className={`em ${e.cls}`}>{e.txt}</span></td>
                      <td className="num">{p.valor !== null ? usd(p.valor) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
