import Link from "next/link";
import { soloAdmin } from "@/lib/sesion";
import { tasaUsdCop } from "@/lib/fx";
import { clientesParaFactura } from "@/lib/facturacion";
import { FacturaForm } from "@/components/FacturaForm";
import { crearFactura } from "../acciones";

export const metadata = { title: "Nueva factura" };
export const dynamic = "force-dynamic";

export default async function NuevaFacturaPage({ searchParams }: { searchParams: Promise<{ mes?: string; error?: string }> }) {
  await soloAdmin();
  const sp = await searchParams;
  const h = new Date();
  const mes = sp.mes && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}`;
  const [fx, clientes] = await Promise.all([tasaUsdCop(), clientesParaFactura()]);
  return (
    <main className="wrap">
      <p><Link href={`/trd/clientes?mes=${mes}`} className="link-ver">← Clientes</Link></p>
      <h1>Agregar cliente / factura</h1>
      <p className="sub">Mes {mes}. La pasarela, el IVA y el neto se calculan solos.</p>
      <FacturaForm action={crearFactura} mes={mes} tasa={fx.cop} clientes={clientes} error={sp.error ? decodeURIComponent(sp.error) : undefined} />
    </main>
  );
}
