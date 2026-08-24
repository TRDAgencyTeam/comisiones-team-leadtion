import Link from "next/link";
import { soloAdmin } from "@/lib/sesion";
import { tasaUsdCop } from "@/lib/fx";
import { listarGastos, valorMensualCop, CATEGORIA_LABEL, RECURRENCIA_LABEL, type CategoriaGasto } from "@/lib/gastos-fijos";
import { eliminarGasto } from "./acciones";

export const metadata = { title: "Gastos" };
export const dynamic = "force-dynamic";

const cop = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
const money = (n: number, m: string) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: m, maximumFractionDigits: m === "USD" ? 2 : 0 }).format(n);

const ORDEN: CategoriaGasto[] = ["servicio_publico", "otro", "herramienta", "hosting", "paso_dinero"];

export default async function GastosPage() {
  await soloAdmin();
  const [gastos, fx] = await Promise.all([listarGastos(), tasaUsdCop()]);

  return (
    <main className="wrap">
      <div className="reg-head">
        <div>
          <h1>Gastos</h1>
          <p className="sub">Servicios públicos, otros fijos, herramientas, hosting y paso de dinero. Tasa {cop(fx.cop)}.</p>
        </div>
        <Link href="/trd/gastos-fijos/gastos/nuevo" className="btn-primary">+ Agregar gasto</Link>
      </div>

      {ORDEN.map((cat) => {
        const items = gastos.filter((g) => g.categoria === cat);
        if (items.length === 0) return null;
        return (
          <div key={cat} className="doc-grupo" style={{ marginTop: 16 }}>
            <h4>{CATEGORIA_LABEL[cat]}</h4>
            <div className="reg-tabla-wrap">
              <table className="reg-tabla">
                <thead>
                  <tr>
                    <th>Nombre</th><th>Recurrencia</th><th className="right">Valor</th>
                    <th className="right">% empresa</th><th className="right">COP / mes</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((g) => (
                    <tr key={g.id} className={g.activo ? "" : "fila-inactiva"}>
                      <td>
                        <Link href={`/trd/gastos-fijos/gastos/${g.id}`} className="link-ver">{g.nombre}</Link>
                        {g.metodoPago && <span className="muted"> · {g.metodoPago}</span>}
                        {!g.afectaUtilidad && <span className="freelance-tag" style={{ marginLeft: 6 }}>no utilidad</span>}
                      </td>
                      <td className="muted">{RECURRENCIA_LABEL[g.recurrencia]}{g.diaCobro ? ` · día ${g.diaCobro}` : ""}</td>
                      <td className="right">{money(g.valor, g.moneda)}</td>
                      <td className="right muted">{g.categoria === "servicio_publico" ? `${g.porcentajeReparto}%` : "—"}</td>
                      <td className="right strong">{cop(valorMensualCop(g, fx.cop))}</td>
                      <td>
                        <form action={eliminarGasto}>
                          <input type="hidden" name="id" value={g.id} />
                          <button type="submit" className="btn-borrar" title="Eliminar">🗑️</button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {gastos.length === 0 && <p className="empty">Aún no hay gastos. Agrega el primero.</p>}
    </main>
  );
}
