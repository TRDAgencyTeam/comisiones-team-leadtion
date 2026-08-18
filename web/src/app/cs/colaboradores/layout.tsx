import { soloAdmin } from "@/lib/sesion";

/** Solo el admin puede gestionar colaboradores. */
export default async function ColaboradoresLayout({ children }: { children: React.ReactNode }) {
  await soloAdmin();
  return <>{children}</>;
}
