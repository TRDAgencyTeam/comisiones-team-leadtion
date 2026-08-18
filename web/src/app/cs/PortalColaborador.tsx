import { resultadoDeColaborador } from "@/lib/comisiones";

/**
 * Portal del colaborador de Customer Success: vista limitada con lo que le
 * corresponde de comisión este mes, cuántas cuentas cuentan para él y la lista
 * de esas cuentas (solo el nombre). No ve datos del resto del equipo.
 */

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

export async function PortalColaborador({
  colaboradorId,
  nombre,
}: {
  colaboradorId: number;
  nombre: string;
}) {
  const now = new Date();
  const mesNombre = `${MESES[now.getMonth()]} ${now.getFullYear()}`;
  // Corte = fin del mes en curso: refleja la comisión de todo este mes.
  const corte = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  let error: string | null = null;
  let comision = 0;
  let cuentas: { id: number; nombre: string }[] = [];
  try {
    const r = await resultadoDeColaborador(colaboradorId, corte);
    if (r) {
      comision = r.total;
      cuentas = r.lineas.map((l) => ({ id: l.clienteId, nombre: l.clienteNombre }));
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  return (
    <main className="wrap">
      <header className="page">
        <h1>Hola, {nombre.split(" ")[0]} 👋</h1>
        <p>Tu resumen de comisiones de Customer Success · {mesNombre}</p>
      </header>

      {error ? (
        <div className="card"><strong>No se pudo cargar.</strong><p className="empty">{error}</p></div>
      ) : (
        <>
          <div className="kpis kpis-2">
            <div className="kpi kpi-pag">
              <span className="kpi-label">Tu comisión de {MESES[now.getMonth()]}</span>
              <span className="kpi-num">{usd(comision)}</span>
            </div>
            <div className="kpi kpi-total">
              <span className="kpi-label">Cuentas que cuentan para ti</span>
              <span className="kpi-num">{cuentas.length}</span>
            </div>
          </div>

          <section className="card">
            <div className="card-head"><span className="who">Tus cuentas</span></div>
            {cuentas.length === 0 ? (
              <p className="empty">Este mes todavía no tienes cuentas que generen comisión.</p>
            ) : (
              <div className="table-scroll">
                <table>
                  <thead><tr><th>#</th><th>Cliente</th></tr></thead>
                  <tbody>
                    {cuentas.map((c, i) => (
                      <tr key={c.id}><td className="td-sub">{i + 1}</td><td>{c.nombre}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <p className="foot">
            Es un resumen. Si ves algo raro en tu comisión o tus cuentas, escríbele al
            administrador. Los montos se calculan según las reglas del equipo (hitos por
            antigüedad de cada cuenta).
          </p>
        </>
      )}
    </main>
  );
}
