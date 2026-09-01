import Link from "next/link";
import { notFound } from "next/navigation";
import { soloAdmin } from "@/lib/sesion";
import { tasaUsdCop } from "@/lib/fx";
import { obtenerFactura, clientesParaFactura } from "@/lib/facturacion";
import { FacturaForm } from "@/components/FacturaForm";
import { editarFactura } from "../acciones";

export const metadata = { title: "Editar factura" };
export const dynamic = "force-dynamic";

export default async function EditarFacturaPage({ params }: { params: Promise<{ id: string }> }) {
  await soloAdmin();
  const { id } = await params;
  const [factura, fx, clientes] = await Promise.all([obtenerFactura(Number(id)), tasaUsdCop(), clientesParaFactura()]);
  if (!factura) notFound();
  return (
    <main className="wrap">
      <p><Link href="/trd/clientes" className="link-ver">← Clientes</Link></p>
      <h1>{factura.clienteNombre}</h1>
      <p className="sub">Editar factura ({factura.entidad}).</p>
      <FacturaForm action={editarFactura} mes="" tasa={fx.cop} factura={factura} clientes={clientes} />
    </main>
  );
}
