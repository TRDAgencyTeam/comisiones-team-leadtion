"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/membresias/dashboard", label: "Dashboard" },
  { href: "/membresias/clientes", label: "Clientes" },
  { href: "/membresias/cobros", label: "Cobros" },
];

export function MembresiasNav() {
  const pathname = usePathname();
  const enDashboard = pathname.startsWith("/membresias/dashboard");
  const enCobros = pathname.startsWith("/membresias/cobros");
  return (
    <nav className="nav">
      {LINKS.map((l) => {
        // Clientes queda activo en la lista, ficha, nuevo, editar… (todo lo que no
        // sea dashboard ni cobros).
        const activo =
          l.href === "/membresias/dashboard" ? enDashboard
          : l.href === "/membresias/cobros" ? enCobros
          : !enDashboard && !enCobros;
        return (
          <Link key={l.href} href={l.href} className={activo ? "nav-link activo" : "nav-link"}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
