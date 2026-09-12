import { proyeccionCobros } from "@/lib/cobros";

export const dynamic = "force-dynamic";

const usd = (n: number) => (n > 0 ? n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }) : "—");
const MES3 = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const etiquetaMes = (ym: string) => { const [y, m] = ym.split("-").map(Number); return `${MES3[(m! - 1) % 12]} ${String(y).slice(2)}`; };

export default async function CobrosPage() {
  let data;
  try { data = await proyeccionCobros(3); }
  catch (e) {
    return <main className="wrap"><div className="card"><strong>No se pudo cargar.</strong><p className="empty">{e instanceof Error ? e.message : String(e)}</p></div></main>;
  }
  const { meses, filas, totalesPorMes } = data;
  const hoyYM = new Date().toISOString().slice(0, 7);

  return (
    <main className="wrap">
      <header className="page">
        <h1>Cobros próximos</h1>
        <p>Lo que se le cobra a cada miembro este mes y los siguientes, sin entrar cliente por cliente.
          {" "}<b>Sólido</b> = cobro real/en curso · <b className="cobro-proy-lbl">tenue</b> = proyectado.</p>
      </header>

      <section className="card">
        <div className="table-scroll">
          <table className="cobros-tabla">
            <thead>
              <tr>
                <th>Cliente</th><th className="num">Corte</th>
                {meses.map((m) => <th key={m} className={`num${m === hoyYM ? " col-hoy" : ""}`}>{etiquetaMes(m)}{m === hoyYM ? " ·hoy" : ""}</th>)}
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.id}>
                  <td className="nom">{f.nombre}</td>
                  <td className="num">{f.corteDia ?? "—"}</td>
                  {f.celdas.map((c) => (
                    <td key={c.mes} className={`num cobro-cell${c.proyectado ? " proy" : ""}${c.mes === hoyYM ? " col-hoy" : ""}`}>{usd(c.valor)}</td>
                  ))}
                  <td className="num strong">{usd(f.total)}</td>
                </tr>
              ))}
              {filas.length === 0 && <tr><td colSpan={meses.length + 3} className="empty">Sin cobros proyectados.</td></tr>}
            </tbody>
            {filas.length > 0 && (
              <tfoot>
                <tr className="fila-total">
                  <td>Total</td><td></td>
                  {totalesPorMes.map((t, i) => <td key={i} className="num">{usd(t)}</td>)}
                  <td className="num">{usd(totalesPorMes.reduce((s, x) => s + x, 0))}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>
    </main>
  );
}
