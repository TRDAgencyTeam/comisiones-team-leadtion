import Link from "next/link";
import { soloAdmin } from "@/lib/sesion";
import { tasaUsdCop } from "@/lib/fx";
import { catalogoServicios, clientesParaFactura } from "@/lib/facturacion";
import { ClientesHeader } from "@/components/ClientesHeader";
import { NuevaFacturaForm } from "@/components/NuevaFacturaForm";

export const metadata = { title: "Nueva factura" };
export const dynamic = "force-dynamic";

export default async function NuevaFacturaPage({ searchParams }: { searchParams: Promise<{ mes?: string; error?: string }> }) {
  await soloAdmin();
  const sp = await searchParams;
  const h = new Date();
  const mes = sp.mes && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}`;
  const [fx, catalogo, clientes] = await Promise.all([tasaUsdCop(), catalogoServicios(), clientesParaFactura()]);
  return (
    <main className="cf">
      <ClientesHeader mes={mes} activo="facturacion" tasa={fx.cop} titulo="Nueva factura" />
      <p style={{ margin: "0 0 12px" }}><Link href={`/trd/clientes/facturacion?mes=${mes}`} className="link-ver">← Volver a facturación</Link></p>
      {sp.error && <p className="alerta">{decodeURIComponent(sp.error)}</p>}
      <p className="cf-nota" style={{ marginTop: 0, marginBottom: 14 }}>Factura de este mes para un <b>cliente que ya existe</b> (elígelo de la lista; la factura se suma a su cuenta). Si es un cliente nuevo, usa <b>+ Nuevo cliente</b>. La pasarela, el IVA y el neto se calculan solos.</p>
      <NuevaFacturaForm mes={mes} tasa={fx.cop} catalogo={catalogo} clientes={clientes} />
    </main>
  );
}
