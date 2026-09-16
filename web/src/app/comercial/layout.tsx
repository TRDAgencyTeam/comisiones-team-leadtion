import Link from "next/link";
import { logout } from "@/app/login/actions";
import { Logo } from "@/components/Brand";
import { soloAdmin } from "@/lib/sesion";

export const metadata = { title: "Comercial" };

/** Shell del módulo Comercial (equipo interno). Solo admin por ahora. */
export default async function ComercialLayout({ children }: { children: React.ReactNode }) {
  const sesion = await soloAdmin();
  return (
    <>
      <div className="topbar">
        <div className="brand">
          <Logo height={26} />
          <span className="brand-modulo brand-mem">Comercial</span>
        </div>
        <div className="topbar-right">
          {sesion.email && <span className="user-email">{sesion.email}</span>}
          <Link href="/modulos/equipo" className="logout">Equipo interno</Link>
          <form action={logout}>
            <button type="submit" className="logout">Salir</button>
          </form>
        </div>
      </div>
      {children}
    </>
  );
}
