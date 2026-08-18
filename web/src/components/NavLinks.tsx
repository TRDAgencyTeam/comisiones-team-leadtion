"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/cs", label: "Dashboard" },
  { href: "/cs/comisiones", label: "Comisiones" },
  { href: "/cs/clientes", label: "Clientes" },
  { href: "/cs/colaboradores", label: "Colaboradores" },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="nav">
      {LINKS.map((l) => {
        const activo = l.href === "/cs" ? pathname === "/cs" : pathname.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} className={activo ? "nav-link activo" : "nav-link"}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
