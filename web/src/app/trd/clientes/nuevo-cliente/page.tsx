import Link from "next/link";
import { soloAdmin } from "@/lib/sesion";
import { tasaUsdCop } from "@/lib/fx";
import { opcionesFormulario } from "@/lib/membresias";
import { NuevoClienteForm } from "@/components/NuevoClienteForm";
import { crearClienteCascada } from "../acciones";

export const metadata = { title: "Nuevo cliente" };
export const dynamic = "force-dynamic";

export default async function NuevoClientePage({ searchParams }: { searchParams: Promise<{ mes?: string; error?: string }> }) {
  await soloAdmin();
  const sp = await searchParams;
  const h = new Date();
  const mes = sp.mes && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}`;
  const [fx, opciones] = await Promise.all([tasaUsdCop(), opcionesFormulario()]);
  return (
    <main className="wrap">
      <p><Link href={`/trd/clientes?mes=${mes}`} className="link-ver">← Clientes</Link></p>
      <h1>Nuevo cliente (cascada)</h1>
      <p className="sub">Se crea una sola vez aquí y baja a Membresías, Afiliados y Customer Success. Además crea su primera factura del mes.</p>
      <NuevoClienteForm
        action={crearClienteCascada} mes={mes} tasa={fx.cop}
        afiliados={opciones.afiliados} colaboradores={opciones.colaboradores}
        error={sp.error ? decodeURIComponent(sp.error) : undefined}
      />
    </main>
  );
}
