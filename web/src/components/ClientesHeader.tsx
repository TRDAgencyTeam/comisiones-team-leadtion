import Link from "next/link";

const cop = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
const nombreMes = (iso: string) => {
  const [a, m] = iso.split("-").map(Number);
  const s = new Date(a!, m! - 1, 1).toLocaleDateString("es-CO", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const TABS = [
  { key: "resumen", label: "Resumen del mes", href: "/trd/clientes" },
  { key: "facturacion", label: "Facturación", href: "/trd/clientes/facturacion" },
  { key: "egresos", label: "Egresos", href: "/trd/clientes/egresos" },
];

/** Encabezado común de las 3 pestañas: eyebrow + título + selector de mes + tasa + tabs. */
export function ClientesHeader({
  mes, activo, tasa, titulo,
}: { mes: string; activo: "resumen" | "facturacion" | "egresos"; tasa: number; titulo?: string }) {
  const tituloTab = { resumen: `Resumen de ${nombreMes(mes)}`, facturacion: `Facturación de ${nombreMes(mes)}`, egresos: `Egresos de ${nombreMes(mes)}` };
  return (
    <>
      <div className="cf-top">
        <div>
          <div className="cf-eyebrow">Módulo madre · Ingresos</div>
          <h1 className="cf-title">{titulo ?? tituloTab[activo]}</h1>
        </div>
        <div className="cf-monthbox">
          <form className="cf-monthpick">
            <input type="month" name="mes" defaultValue={mes} />
            <button type="submit">Ver</button>
          </form>
          <span className="cf-rate">Tasa USD→COP <b>{cop(tasa)}</b></span>
        </div>
      </div>
      <nav className="cf-tabs">
        {TABS.map((t) => (
          <Link key={t.key} href={`${t.href}?mes=${mes}`} className={`cf-tab${activo === t.key ? " on" : ""}`}>{t.label}</Link>
        ))}
      </nav>
    </>
  );
}
