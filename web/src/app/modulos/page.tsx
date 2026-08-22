import Link from "next/link";
import { TrdLogo } from "@/components/Brand";
import { logout } from "@/app/login/actions";
import { soloAdmin } from "@/lib/sesion";

export const metadata = { title: "Módulos" };
export const dynamic = "force-dynamic";

export default async function ModulosPage() {
  const usuario = await soloAdmin();

  return (
    <main className="modulos-wrap">
      <div className="modulos-top">
        <TrdLogo height={32} variant="light" />
        <div className="topbar-right">
          {usuario && <span className="user-email">{usuario.email}</span>}
          <form action={logout}>
            <button type="submit" className="logout">Salir</button>
          </form>
        </div>
      </div>

      <div className="modulos-centro">
        <h1>Plataforma TRD Investment</h1>
        <p className="sub">Elige el área con la que vas a trabajar.</p>

        <div className="modulos-grid">
          <Link href="/trd/reg" className="modulo-card activa modulo-trd">
            <span className="modulo-icono">▲</span>
            <span className="modulo-nombre">TRD Investment (madre)</span>
            <span className="modulo-desc">Finanzas de la matriz. Ahora: Registro contable (retenciones y pagos).</span>
            <span className="modulo-cta">Entrar →</span>
          </Link>

          <Link href="/modulos/equipo" className="modulo-card activa">
            <span className="modulo-icono">◆</span>
            <span className="modulo-nombre">Comisiones Equipo Interno</span>
            <span className="modulo-desc">Customer Success y Comercial (equipo propio).</span>
            <span className="modulo-cta">Entrar →</span>
          </Link>

          <Link href="/afiliados" className="modulo-card activa">
            <span className="modulo-icono">◆</span>
            <span className="modulo-nombre">Comisiones Afiliados</span>
            <span className="modulo-desc">Realtors y agencias que recomiendan el CRM.</span>
            <span className="modulo-cta">Entrar →</span>
          </Link>

          <Link href="/membresias/dashboard" className="modulo-card activa">
            <span className="modulo-icono">◆</span>
            <span className="modulo-nombre">Clientes / Membresías</span>
            <span className="modulo-desc">Maestro de clientes, planes e ingresos/costos de Leadtion.</span>
            <span className="modulo-cta">Entrar →</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
