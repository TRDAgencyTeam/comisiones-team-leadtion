import Link from "next/link";
import { notFound } from "next/navigation";
import { soloAdmin } from "@/lib/sesion";
import { obtenerGasto, historialCobrosGasto } from "@/lib/gastos-fijos";
import { GastoForm } from "@/components/GastoForm";
import { actualizarGasto } from "../acciones";

export const metadata = { title: "Editar gasto" };
export const dynamic = "force-dynamic";

const cop = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
const usd = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
const nombreMes = (iso: string) => {
  const [a, m] = iso.split("-").map(Number);
  return new Date(a!, (m! - 1), 1).toLocaleDateString("es-CO", { month: "long", year: "numeric" });
};

export default async function EditarGastoPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await soloAdmin();
  const { id } = await params;
  const { error } = await searchParams;
  const gasto = await obtenerGasto(Number(id));
  if (!gasto) notFound();
  const historial = await historialCobrosGasto(gasto.id, gasto.nombre, gasto.categoria);
  return (
    <main className="wrap">
      <p><Link href="/trd/gastos-fijos/gastos" className="link-ver">← Gastos</Link></p>
      <h1>{gasto.nombre}</h1>
      <GastoForm action={actualizarGasto} gasto={gasto} error={error ? decodeURIComponent(error) : undefined} />

      <section className="card" style={{ marginTop: 22 }}>
        <div className="card-head"><span className="who">Historial de cobros por mes</span></div>
        <p className="foot" style={{ margin: "4px 0 12px" }}>
          Lo que costó en cada mes (congelado). Si cambias el costo hoy, solo afecta el mes en curso
          en adelante; los meses anteriores conservan su valor.
        </p>
        {historial.length === 0 ? (
          <p className="empty">Todavía no hay meses registrados para este gasto.</p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead><tr><th>Mes</th><th className="num">Costo</th></tr></thead>
              <tbody>
                {historial.map((h) => (
                  <tr key={h.mes}>
                    <td>{nombreMes(`${h.mes}-01`).replace(/^\w/, (ch) => ch.toUpperCase())}</td>
                    <td className="num">{gasto.moneda === "USD" ? usd(h.usd) : cop(h.cop ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
