import { cargarBase, nivelAfiliado } from "@/lib/afiliados";

export const dynamic = "force-dynamic";

export default async function AfiliadosListaPage() {
  let base = null, error: string | null = null;
  try {
    base = await cargarBase();
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  return (
    <main className="wrap">
      <header className="page">
        <h1>Afiliados</h1>
        <p>Agencias (% pactado) y partners (% por nivel según clientes activos).</p>
      </header>

      {error && <div className="card"><strong>No se pudo cargar.</strong><p className="empty">{error}</p></div>}

      {base && (
        <section className="card">
          <div className="table-scroll">
            <table>
              <thead>
                <tr><th>Afiliado</th><th>Tipo</th><th className="num">Clientes activos</th><th>Nivel</th><th className="num">% / comisión</th></tr>
              </thead>
              <tbody>
                {base.afiliados.map((a) => {
                  const nv = nivelAfiliado(a.ref, base.clientes);
                  return (
                    <tr key={a.ref}>
                      <td>{a.nombre}</td>
                      <td>
                        <span className={a.tipo === "agencia" ? "tag-agencia" : "tag-partner"}>
                          {a.tipo === "agencia" ? "Agencia" : "Partner"}
                        </span>
                      </td>
                      <td className="num">{nv.activos}</td>
                      <td>Nivel {nv.nivel}</td>
                      <td className="num">
                        {a.tipo === "agencia" && a.comisionAgencia && a.comisionAgencia > 0
                          ? `${a.comisionAgencia}% servicios · ${nv.pct * 100}% lic.`
                          : `${nv.pct * 100}% licencia`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="foot">Agregar y editar afiliados llega en la siguiente iteración de este módulo.</p>
    </main>
  );
}
