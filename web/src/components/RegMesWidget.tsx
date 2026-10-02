"use client";

import { useRouter } from "next/navigation";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Selector de MES de pago de REG, prominente (como el widget de tasa). Muestra
 * grande el mes seleccionado y si es el mes en curso o uno pasado, y permite
 * cambiarlo. Objetivo: que nunca se confunda el mes antes de pagar.
 */
export function RegMesWidget({ mes, esActual }: { mes: string; esActual: boolean }) {
  const router = useRouter();
  const [a, m] = mes.split("-").map(Number);
  const nombre = new Date(a!, m! - 1, 1).toLocaleDateString("es-CO", { month: "long", year: "numeric" });

  return (
    <div className={`mes-widget ${esActual ? "actual" : "pasado"}`}>
      <span className="mes-cab">
        <span className="mes-lbl">Mes de pago</span>
        <span className={`mes-badge ${esActual ? "actual" : "pasado"}`}><i className="dot" />{esActual ? "Mes en curso" : "Mes pasado"}</span>
      </span>
      <span className="mes-val">{cap(nombre)}</span>
      <label className="mes-pick">
        <span>Cambiar mes</span>
        <input type="month" defaultValue={mes} onChange={(e) => { if (e.target.value) router.push(`/trd/reg?mes=${e.target.value}`); }} />
      </label>
    </div>
  );
}
