import Link from "next/link";
import { logout } from "@/app/login/actions";
import { AfiliadosNav } from "@/components/AfiliadosNav";
import { Logo } from "@/components/Brand";
import { soloAdmin } from "@/lib/sesion";

export const metadata = { title: "Afiliados" };

/** Shell del módulo Comisiones Afiliados (mismo branding que el equipo interno). */
export default async function AfiliadosLayout({
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
          <span className="brand-modulo">Afiliados</span>
        </div>
        <div className="topbar-right">
          {usuario && <span className="user-email">{usuario.email}</span>}
          <Link href="/modulos" className="logout">Módulos</Link>
          <form action={logout}>
            <button type="submit" className="logout">Salir</button>
          </form>
        </div>
      </div>
      <AfiliadosNav />
      <div className="acciones-modulo">
        <Link href="/afiliados/afiliados/nuevo" className="btn-secondary">+ Nuevo afiliado</Link>
        <Link href="/afiliados/clientes/nuevo" className="btn-primary">+ Nuevo cliente</Link>
      </div>
      {children}
    </>
  );
}
