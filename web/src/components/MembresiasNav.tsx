"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/membresias", label: "Clientes" },
  { href: "/membresias/dashboard", label: "Dashboard" },
];

export function MembresiasNav() {
  const pathname = usePathname();
  return (
    <nav className="nav">
      {LINKS.map((l) => {
        const activo = l.href === "/membresias" ? pathname === "/membresias" : pathname.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} className={activo ? "nav-link activo" : "nav-link"}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
