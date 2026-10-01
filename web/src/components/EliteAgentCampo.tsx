"use client";

import { useState } from "react";
import { InputMonto } from "@/components/InputMonto";
import { guardarElite } from "@/app/trd/liquidacion/acciones";

const cop = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

/**
 * Casilla aparte de la liquidación: ingreso de Elite Agent que se le paga a
 * Mauricio Ovalle. Se escribe SIEMPRE en USD y se ve en COP al instante con la
 * tasa de cálculo del mes.
 */
export function EliteAgentCampo({ mes, usdInicial, tasa }: { mes: string; usdInicial: number; tasa: number }) {
  const [usd, setUsd] = useState(usdInicial);
  return (
    <form action={guardarElite} className="liq-elite">
      <input type="hidden" name="mes" value={mes} />
      <div className="liq-elite-in">
        <span className="cf-chip llc">USD</span>
        <InputMonto name="eliteUsd" defaultValue={usdInicial || ""} onValor={setUsd} placeholder="Valor en dólares" />
        <button type="submit" className="cf-btn cf-btn-ghost">Guardar</button>
      </div>
      <small>≈ <b>{cop(Math.round(usd * tasa))}</b> a la tasa de cálculo ({cop(tasa)})</small>
    </form>
  );
}
