"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/membresias/dashboard", label: "Dashboard" },
  { href: "/membresias/clientes", label: "Clientes" },
];

export function MembresiasNav() {
  const pathname = usePathname();
  const enDashboard = pathname.startsWith("/membresias/dashboard");
  return (
    <nav className="nav">
      {LINKS.map((l) => {
        // Dashboard activo solo en el dashboard; Clientes activo en la lista, ficha,
        // nuevo, editar y registrar servicio (cualquier cosa que no sea el dashboard).
        const activo = l.href === "/membresias/dashboard" ? enDashboard : !enDashboard;
        return (
          <Link key={l.href} href={l.href} className={activo ? "nav-link activo" : "nav-link"}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
