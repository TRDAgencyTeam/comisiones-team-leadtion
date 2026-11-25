import Link from "next/link";
import { soloAdmin } from "@/lib/sesion";
import { ContratoWizard } from "@/components/ContratoWizard";

export const metadata = { title: "Nuevo contrato" };
export const dynamic = "force-dynamic";

export default async function NuevoContratoPage() {
  await soloAdmin();
  return (
    <main className="wrap wide">
      <p><Link href="/trd/contratos" className="link-ver">← Contratos</Link></p>
      <h1>Nuevo contrato</h1>
      <p className="sub">Llena solo lo variable. La vista previa se arma sola: lo <b>resaltado</b> es editable; el resto es cláusula fija (logos, tipografía y diseño intactos).</p>
      <ContratoWizard />
    </main>
  );
}
