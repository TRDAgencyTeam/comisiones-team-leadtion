import Link from "next/link";
import { logout } from "@/app/login/actions";
import { NavLinks } from "@/components/NavLinks";
import { Logo } from "@/components/Brand";
import { sesionActual } from "@/lib/sesion";

/**
 * Shell de Customer Success. El admin ve el menú completo y el enlace a Módulos;
 * un colaborador ve una barra mínima (su nombre + Salir) y NINGÚN menú de admin.
 */
export default async function CSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sesion = await sesionActual();
  const esAdmin = sesion.rol === "admin";

  return (
    <>
      <div className="topbar">
        <div className="brand">
          <Logo height={26} />
          {!esAdmin && <span className="brand-modulo brand-mem">Portal Colaboradores</span>}
        </div>
        <div className="topbar-right">
          {sesion.email && <span className="user-email">{esAdmin ? sesion.email : sesion.nombre ?? sesion.email}</span>}
          {esAdmin && <Link href="/modulos" className="logout">Módulos</Link>}
          <form action={logout}>
            <button type="submit" className="logout">Salir</button>
          </form>
        </div>
      </div>
      {esAdmin && <NavLinks />}
      {children}
    </>
  );
}
