import Link from "next/link";
import { soloAdmin } from "@/lib/sesion";
import { resumenGastosFijos } from "@/lib/gastos-fijos";

export const metadata = { title: "Gastos Fijos" };
export const dynamic = "force-dynamic";

const cop = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
const usd = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);

export default async function GastosFijosResumen() {
  await soloAdmin();
  const r = await resumenGastosFijos();

  const filas: { label: string; valor: number; link?: string }[] = [
    { label: "Nómina", valor: r.nomina, link: "/trd/gastos-fijos/nomina" },
    { label: "Servicios públicos", valor: r.porCategoria.servicio_publico, link: "/trd/gastos-fijos/gastos" },
    { label: "Otros fijos", valor: r.porCategoria.otro, link: "/trd/gastos-fijos/gastos" },
    { label: "Herramientas / Suscripciones", valor: r.porCategoria.herramienta, link: "/trd/gastos-fijos/gastos" },
    { label: "Hosting (amortizado)", valor: r.porCategoria.hosting, link: "/trd/gastos-fijos/gastos" },
    { label: "Crédito (cuotas)", valor: r.credito, link: "/trd/gastos-fijos/credito" },
  ];

  return (
    <main className="wrap">
      <h1>Gastos Fijos</h1>
      <p className="sub">Total mensual que alimenta el resumen del mes. Tasa USD→COP {cop(r.tasa)}.</p>

      <div className="reg-totales">
        <div className="kpi destacado">
          <span className="kpi-lbl">Total gastos fijos / mes</span>
          <span className="kpi-num">{cop(r.totalCop)}</span>
          <span className="kpi-lbl" style={{ marginTop: 4 }}>≈ {usd(r.totalUsd)}</span>
        </div>
      </div>

      <div className="reg-tabla-wrap" style={{ marginTop: 8 }}>
        <table className="reg-tabla">
          <thead>
            <tr><th>Concepto</th><th className="right">COP / mes</th><th></th></tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.label}>
                <td>{f.label}</td>
                <td className="right">{cop(f.valor)}</td>
                <td>{f.link && <Link href={f.link} className="link-ver">Gestionar →</Link>}</td>
              </tr>
            ))}
            <tr className="fila-total">
              <td><strong>Total</strong></td>
              <td className="right"><strong>{cop(r.totalCop)}</strong></td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      {r.pasoDinero > 0 && (
        <p className="reg-nota">
          Paso de dinero (no cuenta como gasto/utilidad): {cop(r.pasoDinero)} / mes. Ej: comisiones que pasan por la
          cuenta hacia terceros (Élite Mao).
        </p>
      )}
    </main>
  );
}
