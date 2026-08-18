import { soloAdmin } from "@/lib/sesion";

/** Solo el admin puede ver el detalle de comisiones de todo el equipo. */
export default async function ComisionesLayout({ children }: { children: React.ReactNode }) {
  await soloAdmin();
  return <>{children}</>;
}
