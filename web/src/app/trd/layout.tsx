import { soloAdmin } from "@/lib/sesion";
import { TrdSidebar } from "@/components/TrdSidebar";
import { notificacionesPendientes } from "@/lib/notificaciones";

export const metadata = { title: { template: "%s · TRD", default: "TRD Investment" } };
export const dynamic = "force-dynamic";

/**
 * Shell de la plataforma madre (TRD Investment): menú lateral fijo a la izquierda
 * + contenido a la derecha. Misma tipografía y colores de marca.
 */
export default async function TrdLayout({ children }: { children: React.ReactNode }) {
  const usuario = await soloAdmin();
  const notificaciones = await notificacionesPendientes();
  return (
    <div className="trd-app">
      <TrdSidebar email={usuario?.email ?? null} notificaciones={notificaciones} />
      <div className="trd-main">{children}</div>
    </div>
  );
}
