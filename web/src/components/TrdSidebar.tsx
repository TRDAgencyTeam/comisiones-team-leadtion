"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/login/actions";

const NAV = [
  { href: "/trd/clientes", label: "Resumen del mes", ic: "◈", match: "/trd/clientes", exact: true },
  { href: "/trd/clientes/facturacion", label: "Facturación", ic: "🧾", match: "/trd/clientes/facturacion" },
  { href: "/trd/clientes/egresos", label: "Egresos", ic: "⬦", match: "/trd/clientes/egresos" },
  { href: "/trd/gastos-fijos/nomina", label: "Nómina", ic: "👥", match: "/trd/gastos-fijos/nomina" },
  { href: "/trd/gastos-fijos/herramientas", label: "Herramientas", ic: "🧰", match: "/trd/gastos-fijos/herramientas" },
  { href: "/trd/gastos-fijos/gastos", label: "Operativos fijos", ic: "🏢", match: "/trd/gastos-fijos/gastos" },
  { href: "/trd/clientes/caja", label: "Caja", ic: "🏦", match: "/trd/clientes/caja" },
  { href: "/trd/reg", label: "Registro contable", ic: "▤", match: "/trd/reg" },
];

/** Menú lateral de la plataforma madre (nav con estado activo por ruta). */
export function TrdSidebar({ email }: { email: string | null }) {
  const path = usePathname();
  const activo = (n: (typeof NAV)[number]) => (n.exact ? path === n.href : path.startsWith(n.match));
  return (
    <aside className="trd-side">
      <div className="brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="logo-img" src="/brand/trd/trd-symbol-white.png" alt="TRD Investment" width={40} height={40} />
        <div>
          <div className="brand-name">TRD Investment</div>
          <div className="brand-sub">
            TRD Agency
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="eb-mark" src="/brand/trd/trd-symbol-white.png" alt="" width={12} height={12} />
            Ebenezer
          </div>
        </div>
      </div>
      <div style={{ flex: "1 1 auto", minWidth: 0 }}>
        <div className="side-sec">Operación</div>
        <nav>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={activo(n) ? "on" : ""}>
              <span className="ic">{n.ic}</span> {n.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="side-foot">
        {email && <span className="em">{email}</span>}
        <Link href="/modulos">Módulos</Link>
        <form action={logout}><button type="submit">Salir</button></form>
      </div>
    </aside>
  );
}
