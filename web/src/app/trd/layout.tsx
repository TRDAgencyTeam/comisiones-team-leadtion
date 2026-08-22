import Link from "next/link";
import { logout } from "@/app/login/actions";
import { TrdLogo } from "@/components/Brand";
import { soloAdmin } from "@/lib/sesion";

export const metadata = { title: { template: "%s · TRD", default: "TRD Investment" } };

/**
 * Shell de la sección TRD (plataforma madre: finanzas, registro contable…).
 * Misma tipografía y colores que Leadtion; branding propio (logo + fondo TRD).
 */
export default async function TrdLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await soloAdmin();

  return (
    <div className="trd-shell">
      <div className="topbar trd-topbar">
        <div className="brand">
          <TrdLogo height={26} />
          <span className="brand-modulo brand-trd">TRD Investment</span>
        </div>
        <div className="topbar-right">
          {usuario && <span className="user-email">{usuario.email}</span>}
          <Link href="/modulos" className="logout">Módulos</Link>
          <form action={logout}>
            <button type="submit" className="logout">Salir</button>
          </form>
        </div>
      </div>
      <nav className="trd-nav">
        <Link href="/trd/reg">Registro contable</Link>
      </nav>
      {children}
    </div>
  );
}
