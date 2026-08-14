import Link from "next/link";
import { notFound } from "next/navigation";
import { cargarResumen, SRV_LABELS } from "@/lib/afiliados";
import { editarAfiliado } from "../../acciones";

export const dynamic = "force-dynamic";

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export default async function PerfilAfiliadoPage({
  params,
  searchParams,
}: {
  params: Promise<{ ref: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { ref } = await params;
  const { error } = await searchParams;
  const { afiliados, clientes } = await cargarResumen();
  const a = afiliados.find((x) => x.ref === ref);
  if (!a) notFound();

  const susClientes = clientes.filter((c) => c.afiliadoRef === ref).sort((x, y) => y.totalPagado - x.totalPagado);

  return (
    <main className="wrap">
      <p className="volver"><Link href="/afiliados/afiliados">← Afiliados</Link></p>

      <section className="card perfil-header">
        <span className="perfil-avatar grande">{a.nombre.charAt(0)}</span>
        <div className="perfil-header-info">
          <h1>{a.nombre}</h1>
          <p>
            <span className={a.tipo === "agencia" ? "tag-agencia" : "tag-partner"}>
              {a.tipo === "agencia" ? "Agencia" : "Partner"}
            </span>{" "}
            {a.tipo === "agencia" && a.comisionAgencia && a.comisionAgencia > 0
              ? `· ${a.comisionAgencia}% servicios · ${a.pct * 100}% licencia`
              : `· ${a.pct * 100}% licencia · Nivel ${a.nivel}`}
            {a.email ? ` · ${a.email}` : ""}
          </p>
        </div>
        <div className="perfil-stats">
          <div><span className="ps-num">{a.activos}</span><span className="ps-lbl">Activos</span></div>
          <div><span className="ps-num">{a.totalClientes}</span><span className="ps-lbl">Históricos</span></div>
          <div><span className="ps-num ms-ok">{usd(a.totalPagado)}</span><span className="ps-lbl">Comisión pagada</span></div>
        </div>
      </section>

      <section className="card">
        <div className="card-head"><span className="who">Editar afiliado</span></div>
        <form action={editarAfiliado} className="form-vert">
          <input type="hidden" name="ref" value={a.ref} />
          <div className="form-2col">
            <label>Nombre *<input type="text" name="nombre" required defaultValue={a.nombre} /></label>
            <label>Email<input type="email" name="email" defaultValue={a.email ?? ""} /></label>
          </div>
          <div className="form-2col">
            <label>
              Tipo
              <select name="tipo" defaultValue={a.tipo}>
                <option value="agencia">Agencia</option>
                <option value="partner">Partner</option>
              </select>
            </label>
            <label>
              % Comisión sobre servicios (solo agencia)
              <input type="number" step="0.1" name="comision_agencia"
                defaultValue={a.comisionAgencia && a.comisionAgencia > 0 ? a.comisionAgencia : ""} placeholder="Ej: 5 o 10" />
            </label>
          </div>
          <label>Notas<input type="text" name="notas" defaultValue={a.notas ?? ""} placeholder="Opcional" /></label>
          {error && <p className="login-error">{error}</p>}
          <div className="form-actions"><button type="submit" className="btn-primary">Guardar cambios</button></div>
        </form>
      </section>

      <section className="card">
        <div className="card-head"><span className="who">Clientes ({susClientes.length}) · por comisión pagada</span></div>
        {susClientes.length === 0 ? (
          <p className="empty">Este afiliado aún no tiene clientes.</p>
        ) : (
          <div className="perfil-grid">
            {susClientes.map((c) => (
              <div key={c.ref} className="cliente-card">
                <div className="cliente-nombre">{c.nombre}</div>
                <div className="cliente-meta">{c.fechaInicio ?? "—"} · Licencia {c.precioLicencia ? usd(c.precioLicencia) : "—"}</div>
                <div className="cliente-srv">
                  {c.servicios.length === 0 ? <span className="td-concepto">Sin servicios</span> :
                    c.servicios.map((s, i) => <span key={i} className="hito-chip" style={{ marginRight: 4 }}>{SRV_LABELS[s.tipo] ?? s.tipo}{s.precio ? ` ${usd(s.precio)}` : ""}</span>)}
                </div>
                <div className="cliente-pagado">Comisión pagada: <b className="ms-ok">{usd(c.totalPagado)}</b></div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
