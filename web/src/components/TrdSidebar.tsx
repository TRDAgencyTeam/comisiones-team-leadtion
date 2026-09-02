"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/login/actions";

const NAV = [
  { href: "/trd/clientes", label: "Ingresos & Facturación", ic: "◈", match: "/trd/clientes" },
  { href: "/trd/gastos-fijos", label: "Gastos Fijos", ic: "⬦", match: "/trd/gastos-fijos" },
  { href: "/trd/reg", label: "Registro contable", ic: "▤", match: "/trd/reg" },
];

/** Menú lateral de la plataforma madre (nav con estado activo por ruta). */
export function TrdSidebar({ email }: { email: string | null }) {
  const path = usePathname();
  return (
    <aside className="trd-side">
      <div className="brand">
        <div className="logo">▲</div>
        <div><div className="brand-name">TRD Investment</div><div className="brand-sub">Plataforma madre</div></div>
      </div>
      <div style={{ flex: "1 1 auto", minWidth: 0 }}>
        <div className="side-sec">Operación</div>
        <nav>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={path.startsWith(n.match) ? "on" : ""}>
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
