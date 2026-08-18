import Link from "next/link";
import { logout } from "@/app/login/actions";
import { MembresiasNav } from "@/components/MembresiasNav";
import { Logo } from "@/components/Brand";
import { soloAdmin } from "@/lib/sesion";

/** Shell del módulo Clientes / Membresías (branding Leadtion). */
export default async function MembresiasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await soloAdmin();

  return (
    <>
      <div className="topbar">
        <div className="brand">
          <Logo height={26} />
          <span className="brand-modulo brand-mem">Membresías</span>
        </div>
        <div className="topbar-right">
          {usuario && <span className="user-email">{usuario.email}</span>}
          <Link href="/modulos" className="logout">Módulos</Link>
          <form action={logout}>
            <button type="submit" className="logout">Salir</button>
          </form>
        </div>
      </div>
      <MembresiasNav />
      <div className="acciones-modulo">
        <Link href="/membresias/nuevo" className="btn-primary">+ Nuevo cliente</Link>
      </div>
      {children}
    </>
  );
}
