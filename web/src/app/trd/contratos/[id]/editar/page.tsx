import Link from "next/link";
import { notFound } from "next/navigation";
import { soloAdmin } from "@/lib/sesion";
import { obtenerContrato } from "@/lib/contratos";
import { varsPlanMarketingVacias } from "@/lib/contrato-plantilla";
import { ContratoWizard } from "@/components/ContratoWizard";

export const metadata = { title: "Editar contrato" };
export const dynamic = "force-dynamic";

export default async function EditarContratoPage({ params }: { params: Promise<{ id: string }> }) {
  await soloAdmin();
  const { id } = await params;
  const c = await obtenerContrato(Number(id));
  if (!c) notFound();
  const vars = { ...varsPlanMarketingVacias(), ...c.variables };
  return (
    <main className="wrap wide">
      <p><Link href={`/trd/contratos/${c.id}`} className="link-ver">← Volver al contrato</Link></p>
      <h1>Editar contrato</h1>
      <p className="sub">{c.clienteNombre} · Plan Marketing. Cambia lo que necesites; la vista previa se actualiza sola.</p>
      <ContratoWizard id={c.id} inicial={vars} />
    </main>
  );
}
