import { mesHoyISO } from "@/lib/fecha";

const cop = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
const nombreMes = (iso: string) => {
  const [a, m] = iso.split("-").map(Number);
  const s = new Date(a!, m! - 1, 1).toLocaleDateString("es-CO", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
};
/** Suma `d` meses a un "YYYY-MM" y devuelve "YYYY-MM". */
const sumaMes = (iso: string, d: number): string => {
  const [a, m] = iso.slice(0, 7).split("-").map(Number);
  const x = new Date(a!, (m! - 1) + d, 1);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`;
};

/** Encabezado común de las vistas del módulo: eyebrow + título + selector de mes + tasa.
 *  `navMes` agrega flechas ‹ › para ir al mes anterior / siguiente (el siguiente solo
 *  si no pasa del mes en curso). */
export function ClientesHeader({
  mes, activo, tasa, titulo, navMes,
}: { mes: string; activo: "resumen" | "facturacion" | "egresos" | "caja" | "liquidacion"; tasa: number; titulo?: string; navMes?: boolean }) {
  const tituloTab = { resumen: `Resumen de ${nombreMes(mes)}`, facturacion: `Facturación de ${nombreMes(mes)}`, egresos: `Egresos de ${nombreMes(mes)}`, caja: "Caja LLC", liquidacion: `Liquidación de ${nombreMes(mes)}` };
  const prev = sumaMes(mes, -1);
  const next = sumaMes(mes, 1);
  const hayNext = mes.slice(0, 7) < mesHoyISO(); // solo hasta el mes en curso
  return (
    <>
      <div className="cf-top">
        <div>
          <div className="cf-eyebrow">Módulo madre · {activo === "liquidacion" ? "Liquidación USA → COL" : "Ingresos"}</div>
          <h1 className="cf-title">{titulo ?? tituloTab[activo]}</h1>
        </div>
        <div className="cf-monthbox">
          <div className="cf-monthrow">
            {navMes && <a className="cf-mnav" href={`?mes=${prev}`} aria-label="Mes anterior" title="Mes anterior">‹</a>}
            <form className="cf-monthpick">
              <input type="month" name="mes" defaultValue={mes} />
              <button type="submit">Ver</button>
            </form>
            {navMes && (hayNext
              ? <a className="cf-mnav" href={`?mes=${next}`} aria-label="Mes siguiente" title="Mes siguiente">›</a>
              : <span className="cf-mnav disabled" aria-disabled="true" title="No hay mes siguiente (es el mes en curso)">›</span>)}
          </div>
          <span className="cf-rate">Tasa USD→COP <b>{cop(tasa)}</b></span>
        </div>
      </div>
    </>
  );
}
