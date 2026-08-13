"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/afiliados", label: "Dashboard" },
  { href: "/afiliados/comisiones", label: "Comisiones" },
  { href: "/afiliados/afiliados", label: "Afiliados" },
  { href: "/afiliados/clientes", label: "Clientes" },
];

export function AfiliadosNav() {
  const pathname = usePathname();
  return (
    <nav className="nav">
      {LINKS.map((l) => {
        const activo = l.href === "/afiliados" ? pathname === "/afiliados" : pathname.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} className={activo ? "nav-link activo" : "nav-link"}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
