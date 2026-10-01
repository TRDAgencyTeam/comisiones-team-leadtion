import { soloAdmin } from "@/lib/sesion";
import { TrdSidebar } from "@/components/TrdSidebar";

export const metadata = { title: { template: "%s · TRD", default: "TRD Investment" } };

/**
 * Shell de la plataforma madre (TRD Investment): menú lateral fijo a la izquierda
 * + contenido a la derecha. Misma tipografía y colores de marca.
 */
export default async function TrdLayout({ children }: { children: React.ReactNode }) {
  const usuario = await soloAdmin();
  return (
    <div className="trd-app">
      <TrdSidebar email={usuario?.email ?? null} />
      <div className="trd-main">{children}</div>
    </div>
  );
}
