import Link from "next/link";
import {
  listarClientes,
  estadisticasClientes,
  clientesPorMes,
  type ClienteResumen,
} from "@/lib/clientes";

export const dynamic = "force-dynamic";

const CORTE_POR_DEFECTO = "2026-08-05";
const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

const ESTADO_BADGE: Record<string, { txt: string; cls: string }> = {
  activo: { txt: "Activo", cls: "estado-pagado" },
  cancelado: { txt: "Cancelado", cls: "estado-cancelado" },
  pausado: { txt: "Pausado", cls: "estado-pausado" },
};

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ corte?: string; q?: string; orden?: string }>;
}) {
  const { corte: corteParam, q, orden: ordenParam } = await searchParams;
  const corte = corteParam || CORTE_POR_DEFECTO;
  const orden = ordenParam === "antiguo" ? "antiguo" : "nuevo";

  let clientes: ClienteResumen[] | null = null;
  let stats = null;
  let porMes = null;
  let error: string | null = null;
  try {
    [clientes, stats, porMes] = await Promise.all([
      listarClientes(corte, { q, orden }),
      estadisticasClientes(),
      clientesPorMes(),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  return (
    <main className="wrap">
      <header className="page page-head-row">
        <div>
          <h1>Clientes</h1>
          <p>Cuentas de la base y lo que representan para el equipo.</p>
        </div>
        <Link href="/clientes/nuevo" className="btn-primary">+ Agregar cliente</Link>
      </header>

      {error && (
        <div className="card"><strong>No se pudo cargar.</strong><p className="empty">{error}</p></div>
      )}

      {stats && (
        <div className="mini-stats card">
          <div className="mini-stat"><span className="ms-num">{stats.total}</span><span className="ms-lbl">Total</span></div>
          <div className="mini-stat"><span className="ms-num ms-ok">{stats.activos}</span><span className="ms-lbl">Activos</span></div>
          <div className="mini-stat"><span className="ms-num ms-warn">{stats.pausados}</span><span className="ms-lbl">Pausados</span></div>
          <div className="mini-stat"><span className="ms-num ms-bad">{stats.cancelados}</span><span className="ms-lbl">Cancelados</span></div>
          <div className="mini-stat"><span className="ms-num">{stats.conMarketing}</span><span className="ms-lbl">En marketing</span></div>
        </div>
      )}

      <form className="toolbar" method="get">
        <input type="hidden" name="corte" value={corte} />
        <label>
          Buscar
          <input type="search" name="q" defaultValue={q ?? ""} placeholder="Nombre del cliente…" />
        </label>
        <label>
          Orden
          <select name="orden" defaultValue={orden}>
            <option value="nuevo">Más nuevo primero</option>
            <option value="antiguo">Más antiguo primero</option>
          </select>
        </label>
        <button type="submit">Aplicar</button>
      </form>

      {clientes && (
        <section className="card">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th><th>Activación</th><th>Estado</th><th className="num">Comisión equipo</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((c) => {
                  const b = ESTADO_BADGE[c.estado] ?? { txt: c.estado, cls: "" };
                  return (
                    <tr key={c.id}>
                      <td><Link href={`/clientes/${c.id}`} className="link-cliente">{c.nombre}</Link></td>
                      <td>{c.fechaActivacion ?? "—"}</td>
                      <td><span className={b.cls}>{b.txt}</span></td>
                      <td className="num">{c.comisionEquipo > 0 ? usd(c.comisionEquipo) : "—"}</td>
                    </tr>
                  );
                })}
                {clientes.length === 0 && (
                  <tr><td colSpan={4} className="empty">Sin resultados.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {porMes && porMes.length > 0 && (
        <section className="card">
          <div className="card-head"><span className="who">Altas por mes</span></div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr><th>Mes</th><th className="num">Nuevos</th><th className="num">Aún activos</th></tr>
              </thead>
              <tbody>
                {porMes.map((m) => (
                  <tr key={m.mes}>
                    <td>{m.mes}</td>
                    <td className="num">{m.total}</td>
                    <td className="num estado-pagado">{m.activos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
