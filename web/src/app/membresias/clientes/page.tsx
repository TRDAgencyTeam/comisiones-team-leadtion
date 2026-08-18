import Link from "next/link";
import { listarMembresias, statsMembresias, PLAN_LABEL, TIPO_LABEL, type MembresiaRow } from "@/lib/membresias";
import { BotonEliminar } from "../BotonEliminar";

export const dynamic = "force-dynamic";

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const antiguedad = (m: number) => (m <= 0 ? "nuevo" : m === 1 ? "1 mes" : m < 12 ? `${m} meses` : `${Math.floor(m / 12)}a ${m % 12}m`);

const ESTADO_BADGE: Record<string, { txt: string; cls: string }> = {
  activo: { txt: "Activo", cls: "estado-pagado" },
  pausado: { txt: "Pausado", cls: "estado-pausado" },
  cancelado: { txt: "Cancelado", cls: "estado-cancelado" },
};

export default async function ClientesMembresiasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string; orden?: string; tipo?: string }>;
}) {
  const { q, estado = "activo", orden = "nuevo", tipo = "todos" } = await searchParams;

  let lista: MembresiaRow[] = [];
  let stats = null;
  let error: string | null = null;
  try {
    [lista, stats] = await Promise.all([listarMembresias({ q, estado, orden, tipo }), statsMembresias()]);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  // Href de un filtro rápido (mini-stat), conservando búsqueda y orden.
  const href = (est: string, tp: string) => {
    const p = new URLSearchParams();
    p.set("estado", est);
    p.set("tipo", tp);
    if (orden) p.set("orden", orden);
    if (q) p.set("q", q);
    return `/membresias/clientes?${p.toString()}`;
  };
  const clase = (est: string, tp: string) =>
    estado === est && tipo === tp ? "mini-stat activo" : "mini-stat";

  return (
    <main className="wrap">
      <header className="page">
        <h1>Clientes / Membresías</h1>
        <p>Maestro de clientes de Leadtion. De aquí se alimentan Comisiones CS y Afiliados.
          {" "}<b>Toca un número para filtrar la lista.</b></p>
      </header>

      {error && <div className="card"><strong>No se pudo cargar.</strong><p className="empty">{error}</p></div>}

      {stats && (
        <div className="mini-stats card">
          <Link href={href("todos", "todos")} className={clase("todos", "todos")}><span className="ms-num">{stats.total}</span><span className="ms-lbl">Total histórico</span></Link>
          <Link href={href("activo", "todos")} className={clase("activo", "todos")}><span className="ms-num ms-ok">{stats.activas}</span><span className="ms-lbl">Activas</span></Link>
          <Link href={href("pausado", "todos")} className={clase("pausado", "todos")}><span className="ms-num ms-warn">{stats.pausadas}</span><span className="ms-lbl">Pausadas</span></Link>
          <Link href={href("cancelado", "todos")} className={clase("cancelado", "todos")}><span className="ms-num ms-bad">{stats.canceladas}</span><span className="ms-lbl">Canceladas</span></Link>
          <Link href={href("activo", "estandar")} className={clase("activo", "estandar")}><span className="ms-num">{stats.estandar}</span><span className="ms-lbl">Estándar</span></Link>
          <Link href={href("activo", "agencia")} className={clase("activo", "agencia")}><span className="ms-num">{stats.agencia}</span><span className="ms-lbl">Agencia</span></Link>
          <Link href={href("activo", "servicio")} className={clase("activo", "servicio")}><span className="ms-num">{stats.servicio}</span><span className="ms-lbl">Servicio Leadtion</span></Link>
        </div>
      )}

      <form className="toolbar" method="get">
        <label>Buscar<input type="search" name="q" defaultValue={q ?? ""} placeholder="Nombre del cliente…" /></label>
        <label>
          Estado
          <select name="estado" defaultValue={estado}>
            <option value="activo">Activos</option>
            <option value="pausado">Pausados</option>
            <option value="cancelado">Cancelados</option>
            <option value="todos">Todos</option>
          </select>
        </label>
        <label>
          Tipo
          <select name="tipo" defaultValue={tipo}>
            <option value="todos">Todos</option>
            <option value="estandar">Estándar</option>
            <option value="agencia">Agencia</option>
            <option value="servicio">Servicio Leadtion</option>
          </select>
        </label>
        <label>
          Orden
          <select name="orden" defaultValue={orden}>
            <option value="nuevo">Más nuevo</option>
            <option value="antiguo">Más antiguo</option>
            <option value="ltv">Mayor LTV</option>
          </select>
        </label>
        <button type="submit">Aplicar</button>
      </form>

      <section className="card">
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>Cliente</th><th>Plan</th><th>Tipo</th><th>Estado</th><th className="num">Antigüedad</th><th className="num">LTV</th><th></th></tr>
            </thead>
            <tbody>
              {lista.map((c) => {
                const b = ESTADO_BADGE[c.estado] ?? { txt: c.estado, cls: "" };
                const plan = c.planTipo ? PLAN_LABEL[c.planTipo] : "Estándar";
                const soporte = c.soporteValor ? ` · Soporte ${usd(c.soporteValor)}` : "";
                return (
                  <tr key={c.id}>
                    <td><Link href={`/membresias/${c.id}`} className="link-cliente">{c.nombre}</Link></td>
                    <td>{plan}{soporte}</td>
                    <td>{c.tipoCliente === "agencia" ? <span className="tag-agencia">Agencia</span> : <span className="td-concepto">{TIPO_LABEL[c.tipoCliente ?? "estandar"] ?? "Estándar"}</span>}</td>
                    <td><span className={b.cls}>{b.txt}</span></td>
                    <td className="num">{antiguedad(c.tiempoMeses)}</td>
                    <td className="num">{c.ltv > 0 ? usd(c.ltv) : "—"}</td>
                    <td className="col-accion"><BotonEliminar id={c.id} nombre={c.nombre} /></td>
                  </tr>
                );
              })}
              {lista.length === 0 && <tr><td colSpan={7} className="empty">Sin clientes que coincidan.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
