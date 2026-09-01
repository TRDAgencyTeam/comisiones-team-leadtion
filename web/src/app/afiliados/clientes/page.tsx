import Link from "next/link";
import { cargarResumen, SRV_LABELS, type ClienteResumen } from "@/lib/afiliados";
import { BotonEliminarCliente } from "../BotonEliminarCliente";

export const dynamic = "force-dynamic";

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export default async function ClientesAfiliadosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; orden?: string }>;
}) {
  const { q, orden = "consumo" } = await searchParams;
  let clientes: ClienteResumen[] = [];
  let error: string | null = null;
  try {
    ({ clientes } = await cargarResumen());
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  const filtro = (q ?? "").trim().toLowerCase();
  let lista = clientes.filter((c) => !filtro || c.nombre.toLowerCase().includes(filtro) || c.afiliadoNombre.toLowerCase().includes(filtro));
  if (orden === "nombre") lista = lista.sort((a, b) => a.nombre.localeCompare(b.nombre));
  else lista = lista.sort((a, b) => b.totalPagado - a.totalPagado);

  return (
    <main className="wrap">
      <header className="page">
        <h1>Clientes referidos</h1>
        <p>Clientes que entraron por recomendación de un afiliado.</p>
      </header>

      {error && <div className="card"><strong>No se pudo cargar.</strong><p className="empty">{error}</p></div>}

      <form className="toolbar" method="get">
        <label>Buscar<input type="search" name="q" defaultValue={q ?? ""} placeholder="Cliente o afiliado…" /></label>
        <label>
          Orden
          <select name="orden" defaultValue={orden}>
            <option value="consumo">Mayor comisión pagada</option>
            <option value="nombre">Nombre (A-Z)</option>
          </select>
        </label>
        <button type="submit">Aplicar</button>
      </form>

      <div className="perfil-grid">
        {lista.map((c) => (
          <div key={c.ref} className="cliente-card">
            <div className="cliente-nombre">{c.nombre}</div>
            <div className="cliente-meta">
              Traído por{" "}
              <Link href={`/afiliados/afiliados/${c.afiliadoRef}`} className="link-cliente">{c.afiliadoNombre}</Link>{" "}
              <span className={c.afiliadoTipo === "agencia" ? "tag-agencia" : "tag-partner"}>
                {c.afiliadoTipo === "agencia" ? "Agencia" : "Partner"}
              </span>
            </div>
            <div className="cliente-meta">{c.fechaInicio ?? "—"} · Licencia {c.precioLicencia ? usd(c.precioLicencia) : "—"}</div>
            <div className="cliente-srv">
              {c.servicios.length === 0 ? <span className="td-concepto">Sin servicios</span> :
                c.servicios.map((s, i) => <span key={i} className="hito-chip" style={{ marginRight: 4 }}>{SRV_LABELS[s.tipo] ?? s.tipo}{s.precio ? ` ${usd(s.precio)}` : ""}</span>)}
            </div>
            <div className="cliente-pagado">Costó en comisión: <b className="ms-ok">{usd(c.totalPagado)}</b></div>
            <div className="cliente-acciones">
              <BotonEliminarCliente refCliente={c.ref} nombre={c.nombre} />
            </div>
          </div>
        ))}
        {lista.length === 0 && <p className="empty">Sin clientes que coincidan.</p>}
      </div>
    </main>
  );
}
