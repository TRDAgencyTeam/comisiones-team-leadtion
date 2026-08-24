import Link from "next/link";

/** Sub-navegación del módulo Gastos Fijos. */
export default function GastosFijosLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <nav className="subnav">
        <Link href="/trd/gastos-fijos">Resumen</Link>
        <Link href="/trd/gastos-fijos/nomina">Nómina</Link>
        <Link href="/trd/gastos-fijos/gastos">Gastos</Link>
        <Link href="/trd/gastos-fijos/credito">Crédito</Link>
      </nav>
      {children}
    </>
  );
}
