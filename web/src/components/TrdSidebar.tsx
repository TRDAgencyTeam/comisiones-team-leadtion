"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/login/actions";
import { TemaToggle } from "@/components/TemaToggle";

interface Item { href: string; label: string; ic: string; exact?: boolean }
interface Grupo { key: string; label: string; ic: string; href?: string; exact?: boolean; hijos: Item[] }
type Entrada = Item | Grupo;
const esGrupo = (e: Entrada): e is Grupo => "hijos" in e;

const NAV: Entrada[] = [
  { href: "/trd/clientes", label: "Resumen del mes", ic: "◈", exact: true },
  { href: "/trd/clientes/facturacion", label: "Facturación", ic: "🧾" },
  {
    key: "egresos", label: "Egresos", ic: "⬦", href: "/trd/clientes/egresos",
    hijos: [
      { href: "/trd/gastos-fijos/nomina", label: "Nómina", ic: "👥" },
      { href: "/trd/gastos-fijos/herramientas", label: "Herramientas", ic: "🧰" },
      { href: "/trd/gastos-fijos/gastos", label: "Operativos fijos", ic: "🏢" },
    ],
  },
  {
    key: "contabilidad", label: "Contabilidad", ic: "▤",
    hijos: [
      { href: "/trd/reg", label: "Registro contable", ic: "📒" },
      { href: "/trd/liquidacion", label: "Liquidación mensual", ic: "⇄" },
      { href: "/trd/clientes/caja", label: "Caja", ic: "🏦" },
    ],
  },
];

/** Menú lateral de la plataforma madre: enlaces y grupos desplegables (Egresos, Contabilidad). */
export function TrdSidebar({ email }: { email: string | null }) {
  const path = usePathname();
  const activo = (href: string, exact?: boolean) => (exact ? path === href : path === href || path.startsWith(`${href}/`));
  const grupoActivo = (g: Grupo) => (g.href ? activo(g.href, g.exact) : false) || g.hijos.some((h) => activo(h.href, h.exact));
  // Abierto si estás en el grupo; el usuario puede abrir/cerrar a mano.
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({});
  const abierto = (g: Grupo) => abiertos[g.key] ?? grupoActivo(g);
  const alternar = (g: Grupo) => setAbiertos((a) => ({ ...a, [g.key]: !abierto(g) }));

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
      <div className="side-scroll">
        <div className="side-sec">Operación</div>
        <nav>
          {NAV.map((e) => {
            if (!esGrupo(e)) {
              return (
                <Link key={e.href} href={e.href} className={activo(e.href, e.exact) ? "on" : ""}>
                  <span className="ic">{e.ic}</span> {e.label}
                </Link>
              );
            }
            const open = abierto(e);
            const padreOn = e.href ? activo(e.href, e.exact) : false;
            const flecha = (
              <button type="button" className={`side-chev${open ? " open" : ""}`} onClick={() => alternar(e)}
                aria-expanded={open} aria-label={open ? `Ocultar ${e.label}` : `Mostrar ${e.label}`}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m9 6 6 6-6 6" /></svg>
              </button>
            );
            return (
              <div key={e.key} className={`side-grupo${grupoActivo(e) ? " activo" : ""}`}>
                <div className="side-grupo-h">
                  {e.href ? (
                    <Link href={e.href} className={padreOn ? "on" : ""}><span className="ic">{e.ic}</span> {e.label}</Link>
                  ) : (
                    <a role="button" tabIndex={0} className="side-grupo-btn" onClick={() => alternar(e)}
                      onKeyDown={(k) => { if (k.key === "Enter" || k.key === " ") { k.preventDefault(); alternar(e); } }}>
                      <span className="ic">{e.ic}</span> {e.label}
                    </a>
                  )}
                  {flecha}
                </div>
                {open && (
                  <div className="side-hijos">
                    {e.hijos.map((h) => (
                      <Link key={h.href} href={h.href} className={activo(h.href, h.exact) ? "on" : ""}>
                        <span className="ic">{h.ic}</span> {h.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
      <div className="side-foot">
        <TemaToggle />
        {email && <span className="em">{email}</span>}
        <Link href="/modulos">Módulos</Link>
        <form action={logout}><button type="submit">Salir</button></form>
      </div>
    </aside>
  );
}
