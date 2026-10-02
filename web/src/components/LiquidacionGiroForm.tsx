"use client";

import { useState } from "react";
import { InputMonto } from "@/components/InputMonto";
import { cerrarLiquidacion } from "@/app/trd/liquidacion/acciones";
import { hoyISO } from "@/lib/fecha";

const cop = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
const usd = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);

/**
 * Registro del giro real: USD sacados × TASA REAL de la sacada (Bank of America)
 * = COP recibidos. La tasa se prellena con la del día del giro (histórico) y se
 * puede ajustar al valor exacto; queda congelada. Todo el cuadre usa esa tasa.
 */
export function LiquidacionGiroForm({
  mes, usdEstimado, copTotal, tasaCalculo, tasaHoy, tasasPorFecha,
}: {
  mes: string; usdEstimado: number; copTotal: number; tasaCalculo: number;
  tasaHoy: number; tasasPorFecha: Record<string, number>;
}) {
  const hoy = hoyISO();
  const [fecha, setFecha] = useState(hoy);
  const [usdEnv, setUsdEnv] = useState(Math.ceil(usdEstimado));
  const [tasaBanco, setTasaBanco] = useState<number>(tasasPorFecha[hoy] ?? tasaHoy);
  const [tasaTocada, setTasaTocada] = useState(false);
  const [copManual, setCopManual] = useState<number | null>(null);
  const copCalc = Math.round(usdEnv * tasaBanco);
  const copRec = copManual ?? copCalc;
  const dif = copRec - copTotal;

  // Al cambiar la fecha del giro, prellena la tasa de ESE día (si la tenemos).
  const alCambiarFecha = (f: string) => {
    setFecha(f);
    const t = tasasPorFecha[f];
    if (t && t > 0) { setTasaBanco(t); setTasaTocada(false); }
  };
  const tasaDelDia = tasasPorFecha[fecha];

  return (
    <form action={cerrarLiquidacion} className="liq-giro">
      <input type="hidden" name="mes" value={mes} />
      <div className="liq-giro-grid">
        <div className="cf-f"><label>Fecha de la sacada</label>
          <input type="date" name="fechaGiro" value={fecha} max={hoy} onChange={(e) => alCambiarFecha(e.target.value)} />
        </div>
        <div className="cf-f"><label>USD sacados de Bank of America</label><InputMonto name="usdEnviado" valor={usdEnv} onValor={setUsdEnv} required /></div>
        <div className="cf-f"><label>Tasa real de la sacada (COP por 1 USD)</label>
          <InputMonto name="tasaBanco" valor={tasaBanco || null} onValor={(n) => { setTasaBanco(n ?? 0); setTasaTocada(true); }} placeholder="Ej. 3.271,00" required />
          {tasaDelDia
            ? <small className="cf-hint">Tasa de ese día: {cop(tasaDelDia)}. {tasaTocada ? "Ajustada a mano." : "Prellenada; ajústala al valor exacto si difiere."}</small>
            : <small className="cf-hint">No tengo la tasa guardada de ese día: escribe la exacta a la que sacaste.</small>}
        </div>
        <div className="cf-f"><label>COP recibidos</label>
          <InputMonto name="copRecibido" decimales={false} valor={copRec || null} onValor={(n) => setCopManual(n && n !== copCalc ? n : null)} placeholder="USD × tasa de la sacada" />
          {copManual != null && <button type="button" className="tasa-link" onClick={() => setCopManual(null)}>Usar USD × tasa ({cop(copCalc)})</button>}
        </div>
        <div className="cf-f"><label>Costo del giro (USD, opcional)</label><InputMonto name="comisionUsd" placeholder="0" /></div>
        <div className="cf-f"><label>Notas</label><input name="notas" placeholder="Opcional" /></div>
      </div>
      {tasaBanco > 0 && (
        <div className={`liq-cuadre ${dif >= 0 ? "ok" : "falta"}`}>
          <span>Recibes <b>{cop(copRec)}</b> · necesitas <b>{cop(copTotal)}</b></span>
          <b>{dif >= 0 ? `Quedaría saldo a favor en Ebenezer ≈ ${cop(dif)}` : `Faltarían ≈ ${cop(-dif)}`}</b>
          <small>El cuadre final (diezmo, Elite y total) se recalcula con esta tasa real al cerrar.</small>
          {tasaCalculo > 0 && Math.abs(tasaBanco - tasaCalculo) >= 1 && <small>Tu tasa de cálculo era {cop(tasaCalculo)}; la real de la sacada es {cop(tasaBanco)} ({cop(tasaBanco - tasaCalculo)} de diferencia por USD).</small>}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="submit" className="cf-btn cf-btn-primary" disabled={!usdEnv || tasaBanco < 500}>Registrar giro y cerrar liquidación</button>
      </div>
    </form>
  );
}
