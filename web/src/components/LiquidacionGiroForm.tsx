"use client";

import { useState } from "react";
import { InputMonto } from "@/components/InputMonto";
import { cerrarLiquidacion } from "@/app/trd/liquidacion/acciones";
import { hoyISO } from "@/lib/fecha";

const cop = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
const usd = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);

/**
 * Registro del giro real: USD enviados × tasa del banco = COP recibidos (editable
 * si el banco descontó algo). Muestra al instante si alcanza para lo que hay que cubrir.
 */
export function LiquidacionGiroForm({ mes, usdEstimado, copTotal, tasaCalculo }: { mes: string; usdEstimado: number; copTotal: number; tasaCalculo: number }) {
  const [usdEnv, setUsdEnv] = useState(Math.ceil(usdEstimado));
  const [tasaBanco, setTasaBanco] = useState(0);
  const [copManual, setCopManual] = useState<number | null>(null);
  const copCalc = Math.round(usdEnv * tasaBanco);
  const copRec = copManual ?? copCalc;
  const dif = copRec - copTotal;

  return (
    <form action={cerrarLiquidacion} className="liq-giro">
      <input type="hidden" name="mes" value={mes} />
      <div className="liq-giro-grid">
        <div className="cf-f"><label>Fecha del giro</label><input type="date" name="fechaGiro" defaultValue={hoyISO()} max={hoyISO()} /></div>
        <div className="cf-f"><label>USD enviados</label><InputMonto name="usdEnviado" valor={usdEnv} onValor={setUsdEnv} required /></div>
        <div className="cf-f"><label>Tasa del banco (COP por 1 USD)</label><InputMonto name="tasaBanco" valor={tasaBanco || null} onValor={setTasaBanco} placeholder="Ej. 3.890,50" required /></div>
        <div className="cf-f"><label>COP recibidos</label>
          <InputMonto name="copRecibido" decimales={false} valor={copRec || null} onValor={(n) => setCopManual(n && n !== copCalc ? n : null)} placeholder="USD × tasa del banco" />
          {copManual != null && <button type="button" className="tasa-link" onClick={() => setCopManual(null)}>Usar USD × tasa ({cop(copCalc)})</button>}
        </div>
        <div className="cf-f"><label>Costo del giro (USD, opcional)</label><InputMonto name="comisionUsd" placeholder="0" /></div>
        <div className="cf-f"><label>Notas</label><input name="notas" placeholder="Opcional" /></div>
      </div>
      {tasaBanco > 0 && (
        <div className={`liq-cuadre ${dif >= 0 ? "ok" : "falta"}`}>
          <span>Recibes <b>{cop(copRec)}</b> · necesitas <b>{cop(copTotal)}</b></span>
          <b>{dif >= 0 ? `Quedaría saldo a favor en Ebenezer ≈ ${cop(dif)}` : `Faltarían ≈ ${cop(-dif)}`}</b>
          <small>Informativo: no se suma ni se resta en la liquidación del mes siguiente.</small>
          {tasaCalculo > 0 && <small>Frente a la tasa de cálculo ({cop(tasaCalculo)}): {usd(usdEnv)} × {cop(tasaBanco - tasaCalculo)} = {cop(Math.round(usdEnv * (tasaBanco - tasaCalculo)))} de diferencia cambiaria.</small>}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="submit" className="cf-btn cf-btn-primary" disabled={!usdEnv || tasaBanco < 500}>Registrar giro y cerrar liquidación</button>
      </div>
    </form>
  );
}
