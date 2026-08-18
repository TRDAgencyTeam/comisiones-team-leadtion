import { soloAdmin } from "@/lib/sesion";

/** Solo el admin puede ver la gestión de clientes. */
export default async function ClientesLayout({ children }: { children: React.ReactNode }) {
  await soloAdmin();
  return <>{children}</>;
}
