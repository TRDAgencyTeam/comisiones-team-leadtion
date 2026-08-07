import Link from "next/link";
import { Logo } from "@/components/Brand";
import { getUsuario } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";

export const dynamic = "force-dynamic";

export default async function ModulosPage() {
  const usuario = await getUsuario();

  return (
    <main className="modulos-wrap">
      <div className="modulos-top">
        <Logo height={30} />
        <div className="topbar-right">
          {usuario && <span className="user-email">{usuario.email}</span>}
          <form action={logout}>
            <button type="submit" className="logout">Salir</button>
          </form>
        </div>
      </div>

      <div className="modulos-centro">
        <h1>Selecciona un módulo</h1>
        <p className="sub">Elige el área con la que vas a trabajar.</p>

        <div className="modulos-grid">
          <Link href="/" className="modulo-card activa">
            <span className="modulo-icono">◆</span>
            <span className="modulo-nombre">Customer Success</span>
            <span className="modulo-desc">Comisiones y gestión de cuentas del equipo CS.</span>
            <span className="modulo-cta">Entrar →</span>
          </Link>

          <div className="modulo-card deshab" aria-disabled="true">
            <span className="modulo-icono">◇</span>
            <span className="modulo-nombre">Comisiones Comercial</span>
            <span className="modulo-desc">Área comercial. Disponible próximamente.</span>
            <span className="modulo-cta">Próximamente</span>
          </div>
        </div>
      </div>
    </main>
  );
}
