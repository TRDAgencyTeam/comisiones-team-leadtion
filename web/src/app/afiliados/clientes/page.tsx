import Link from "next/link";
import { cargarBase, SRV_LABELS } from "@/lib/afiliados";

export const dynamic = "force-dynamic";

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export default async function ClientesAfiliadosPage() {
  let base = null, error: string | null = null;
  try {
    base = await cargarBase();
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  return (
    <main className="wrap">
      <header className="page page-head-row">
        <div>
          <h1>Clientes referidos</h1>
          <p>Clientes traídos por cada afiliado, con sus servicios.</p>
        </div>
        <Link href="/afiliados/clientes/nuevo" className="btn-primary">+ Nuevo cliente</Link>
      </header>

      {error && <div className="card"><strong>No se pudo cargar.</strong><p className="empty">{error}</p></div>}

      {base && (
        <section className="card">
          <div className="table-scroll">
            <table>
              <thead>
                <tr><th>Cliente</th><th>Afiliado</th><th>Inicio</th><th className="num">Licencia</th><th>Servicios</th></tr>
              </thead>
              <tbody>
                {base.clientes.map((c) => {
                  const af = base.afiliados.find((a) => a.ref === c.afiliadoRef);
                  const srvs = base.servicios.filter((s) => s.clienteRef === c.ref);
                  return (
                    <tr key={c.ref}>
                      <td>{c.nombre}</td>
                      <td>{af?.nombre ?? "—"}</td>
                      <td>{c.fechaInicio ?? "—"}</td>
                      <td className="num">{c.precioLicencia !== null ? usd(c.precioLicencia) : "—"}</td>
                      <td>
                        {srvs.length === 0 ? "—" : srvs.map((s) => (
                          <span key={s.ref} className="hito-chip" style={{ marginRight: 4 }}>
                            {SRV_LABELS[s.tipo] ?? s.tipo} {s.precio ? usd(s.precio) : ""}
                          </span>
                        ))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="foot">Agregar y editar clientes/servicios llega en la siguiente iteración de este módulo.</p>
    </main>
  );
}
