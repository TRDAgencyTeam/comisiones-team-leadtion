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
  incluido_en_marketing: { txt: "Incluido en marketing", cls: "em-mkt" },
  en_riesgo_o_mora: { txt: "En riesgo / mora", cls: "em-riesgo" },
  previo_a_activacion: { txt: "Previo a activación", cls: "em-gris" },
  sin_datos: { txt: "Sin datos", cls: "em-gris" },
};

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

  const cliente = await obtenerCliente(Number(id), corte);
  if (!cliente) notFound();

  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <main className="wrap">
      <p className="volver">
        <Link href="/clientes">← Clientes</Link>
      </p>

      <header className="page page-head-row">
        <div>
          <h1>{cliente.nombre}</h1>
          <p>
            {cliente.estado === "activo" ? (
              <span className="estado-pagado">Activo</span>
            ) : (
              <span className="estado-cancelado">
                Cancelado{cliente.fechaCancelacion ? ` el ${cliente.fechaCancelacion}` : ""}
              </span>
            )}
            {cliente.plan ? ` · ${cliente.plan}` : ""}
          </p>
        </div>

        {cliente.estado === "activo" ? (
          <form action={cambiarEstadoCliente} className="estado-form">
            <input type="hidden" name="id" value={cliente.id} />
            <input type="hidden" name="accion" value="cancelar" />
            <input type="date" name="fechaCancelacion" defaultValue={hoy} title="Fecha de cancelación" />
            <button type="submit" className="btn-danger">Desactivar</button>
          </form>
        ) : (
          <form action={cambiarEstadoCliente} className="estado-form">
            <input type="hidden" name="id" value={cliente.id} />
            <input type="hidden" name="accion" value="reactivar" />
            <button type="submit" className="btn-primary">Reactivar</button>
          </form>
        )}
      </header>

      <section className="card">
        <div className="datos-grid">
          <div><span className="dato-label">Activación</span>{cliente.fechaActivacion ?? "—"}</div>
          <div><span className="dato-label">Valor licencia</span>{cliente.valorLicencia !== null ? usd(cliente.valorLicencia) : "—"}</div>
          <div><span className="dato-label">CRM en marketing</span>{cliente.incluyeCrmMarketing ? "Sí" : "No"}</div>
          <div><span className="dato-label">Servicios</span>{cliente.serviciosAdicionales ?? "—"}</div>
        </div>
        {cliente.notas && <p className="notas">{cliente.notas}</p>}
      </section>

      <section className="card">
        <div className="card-head">
          <span className="who">Comisión que representa para el equipo</span>
          <span className="total">{usd(cliente.comisionEquipo)}</span>
        </div>
        {cliente.aportes.length === 0 ? (
          <p className="empty">No genera comisión al corte {corte} (aún no alcanza hitos o está fuera de vigencia).</p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr><th>Colaborador</th><th>Hito</th><th className="num">Monto</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {cliente.aportes.map((a, i) => (
                  <tr key={i}>
                    <td>{a.colaborador}</td>
                    <td><span className="hito-chip">{a.hito}</span></td>
                    <td className="num">{usd(a.monto)}</td>
                    <td>
                      {a.estado === "pagado"
                        ? <span className="estado-pagado">✓ Pagado</span>
                        : <span className="estado-pendiente">Pendiente</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <span className="who">Historial mensual</span>
        </div>
        {cliente.pagos.length === 0 ? (
          <p className="empty">Sin historial mensual registrado.</p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr><th>Mes</th><th>Estado</th><th className="num">Valor</th></tr>
              </thead>
              <tbody>
                {cliente.pagos.map((p) => {
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
