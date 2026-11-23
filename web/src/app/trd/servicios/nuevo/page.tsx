import Link from "next/link";
import { soloAdmin } from "@/lib/sesion";
import { ServicioForm } from "@/components/ServicioForm";
import { crearServicio } from "../acciones";

export const metadata = { title: "Nuevo servicio" };
export const dynamic = "force-dynamic";

export default async function NuevoServicioPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await soloAdmin();
  const { error } = await searchParams;
  return (
    <main className="wrap">
      <p><Link href="/trd/servicios" className="link-ver">← Servicios y productos</Link></p>
      <h1>Nuevo servicio</h1>
      <p className="sub">Define el servicio y sus reglas. Al guardarlo aparece automáticamente en la lista de Nueva factura.</p>
      <ServicioForm action={crearServicio} error={error ? decodeURIComponent(error) : undefined} />
    </main>
  );
}
