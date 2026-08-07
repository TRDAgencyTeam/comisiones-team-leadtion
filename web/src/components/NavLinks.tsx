"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/comisiones", label: "Comisiones" },
  { href: "/clientes", label: "Clientes" },
  { href: "/colaboradores", label: "Colaboradores" },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="nav">
      {LINKS.map((l) => {
        const activo = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} className={activo ? "nav-link activo" : "nav-link"}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
