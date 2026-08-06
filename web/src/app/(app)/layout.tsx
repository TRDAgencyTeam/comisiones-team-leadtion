import { getUsuario } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";
import { NavLinks } from "@/components/NavLinks";

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
        <div className="brand">Comisiones CS · LEADTION</div>
        <div className="topbar-right">
          {usuario && <span className="user-email">{usuario.email}</span>}
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
