import Link from "next/link";
import { getUsuario } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";
import { NavLinks } from "@/components/NavLinks";
import { Logo } from "@/components/Brand";

/**
 * Shell del panel de administración: barra superior (usuario + salir) y menú de
 * navegación. Envuelve todas las páginas autenticadas; /login queda fuera.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await getUsuario();

  return (
    <>
      <div className="topbar">
        <div className="brand"><Logo height={26} /></div>
        <div className="topbar-right">
          {usuario && <span className="user-email">{usuario.email}</span>}
          <Link href="/modulos" className="logout">Módulos</Link>
          <form action={logout}>
            <button type="submit" className="logout">
              Salir
            </button>
          </form>
        </div>
      </div>
      <NavLinks />
      {children}
    </>
  );
}
